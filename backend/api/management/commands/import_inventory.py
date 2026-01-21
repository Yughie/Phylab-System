from django.core.management.base import BaseCommand
from django.conf import settings
from django.core.files import File
import os
import re
import json


class Command(BaseCommand):
    help = "Import DEFAULT_INVENTORY from frontend/inventory_data.js into InventoryItem and copy images to MEDIA_ROOT"

    def add_arguments(self, parser):
        parser.add_argument('--overwrite', action='store_true', help='Overwrite existing items with same item_key')

    def handle(self, *args, **options):
        overwrite = options['overwrite']

        # Resolve frontend file location (assumes frontend is sibling of backend)
        frontend_dir = os.path.normpath(os.path.join(settings.BASE_DIR, '..', 'frontend'))
        js_path = os.path.join(frontend_dir, 'inventory_data.js')

        if not os.path.exists(js_path):
            self.stderr.write(f'Could not find inventory file at {js_path}')
            return

        with open(js_path, 'r', encoding='utf-8') as f:
            text = f.read()

        # Extract the array literal assigned to DEFAULT_INVENTORY
        m = re.search(r"const\s+DEFAULT_INVENTORY\s*=\s*(\[[\s\S]*?\])\s*;", text, re.M)
        if not m:
            self.stderr.write('Failed to locate DEFAULT_INVENTORY in inventory_data.js')
            return

        arr_text = m.group(1)

        # Remove JS comments (block and single-line)
        arr_text = re.sub(r'/\*[\s\S]*?\*/', '', arr_text)
        arr_text = re.sub(r'//.*', '', arr_text)

        # Convert single-quoted JS strings to double-quoted JSON strings (handles escaped chars)
        arr_text = re.sub(r"'((?:\\.|[^'\\])*)'", r'"\1"', arr_text)

        # Quote unquoted object keys (e.g. itemKey: -> "itemKey":)
        arr_text = re.sub(r'([\{,\[]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:', r'\1"\2":', arr_text)

        # Remove trailing commas before } or ]
        arr_text = re.sub(r',\s*([}\]])', r'\1', arr_text)

        # Replace JS-style escaped single-quotes (e.g. Ohm\'s) which are invalid JSON escapes
        arr_text = arr_text.replace("\\'", "'")

        try:
            data = json.loads(arr_text)
        except Exception as e:
            self.stderr.write('Failed to parse inventory data as JSON: ' + str(e))
            return

        # Import model lazily
        try:
            from api.models import InventoryItem
        except Exception as e:
            self.stderr.write('Could not import InventoryItem model: ' + str(e))
            return

        created = 0
        updated = 0
        skipped = 0

        media_root = getattr(settings, 'MEDIA_ROOT', None)
        if not media_root:
            self.stderr.write('MEDIA_ROOT is not configured in settings; images will not be copied.')

        for entry in data:
            item_key = entry.get('itemKey') or entry.get('item_key')
            if not item_key:
                self.stderr.write('Skipping entry without itemKey: %s' % (entry,))
                skipped += 1
                continue

            obj = None
            try:
                obj = InventoryItem.objects.filter(item_key=item_key).first()
            except Exception:
                obj = None

            if obj and not overwrite:
                skipped += 1
                continue

            if not obj:
                obj = InventoryItem()

            obj.item_key = item_key
            obj.name = entry.get('name', '')
            obj.category = entry.get('category', '')
            obj.stock = entry.get('stock') or 0
            obj.cabinet = entry.get('cabinet', '')
            obj.description = entry.get('description', '')
            # safe attribute names
            if 'type' in entry:
                try:
                    setattr(obj, 'type', entry.get('type', ''))
                except Exception:
                    pass
            if 'use' in entry:
                try:
                    setattr(obj, 'use', entry.get('use', ''))
                except Exception:
                    pass

            # Handle image
            image_rel = entry.get('image')
            if image_rel:
                source_path = os.path.join(frontend_dir, image_rel)
                source_path = os.path.normpath(source_path)
                if os.path.exists(source_path) and media_root:
                    # destination filename — keep basename to avoid very long paths
                    dest_name = os.path.basename(source_path)
                    try:
                        with open(source_path, 'rb') as imgf:
                            django_file = File(imgf)
                            obj.image.save(dest_name, django_file, save=False)
                    except Exception as e:
                        self.stderr.write(f'Failed to copy image for {item_key}: {e}')
                else:
                    if not os.path.exists(source_path):
                        self.stderr.write(f'Image not found: {source_path} (skipping image for {item_key})')

            obj.save()
            if overwrite and obj:
                updated += 1
            else:
                created += 1

        self.stdout.write(f'Import finished — created: {created}, updated: {updated}, skipped: {skipped}')
