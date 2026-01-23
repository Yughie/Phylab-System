// EmailJS configuration and helper functions

const EMAILJS_SERVICE_ID = "service_t43eph7";
const EMAILJS_SHARED_TEMPLATE = "template_33ionwk";

// Initialize EmailJS
(function () {
  if (window.emailjs) {
    emailjs.init("lJ6EFXKyc4N6yIyEG");
  }
})();

// Safe email sending with validation and logging
function safeSendEmail(serviceId, templateId, templateParams) {
  return new Promise((resolve, reject) => {
    if (!window.emailjs || typeof emailjs.send !== "function") {
      return reject(new Error("EmailJS not loaded"));
    }

    const params = Object.assign({}, templateParams);

    // Normalize 'to_email' fields
    if (params.to_email) params.to_email = sanitizeEmail(params.to_email);

    // Fallback: if no to_email present, try to infer from to_name if it's an email
    if (!params.to_email && params.to_name && params.to_name.includes("@")) {
      params.to_email = sanitizeEmail(params.to_name);
    }

    if (!params.to_email) {
      return reject(new Error("Invalid recipient email"));
    }

    // Log minimal payload for debugging
    console.log("EmailJS send:", serviceId, templateId, {
      to: params.to_email,
      to_name: params.to_name || "",
      subject: params.subject || "",
    });

    emailjs.send(serviceId, templateId, params).then(resolve).catch(reject);
  });
}
