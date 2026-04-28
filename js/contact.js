(function () {
  function initContact() {
    const contactForm = document.getElementById("contact-form");
    const feedback = document.getElementById("form-feedback");

    if (!contactForm || !feedback) {
      return;
    }

    contactForm.addEventListener("submit", (event) => {
      event.preventDefault();
      feedback.textContent = "Message staged. This demo form now feels polished, but it still needs a real backend before it can actually send.";
      contactForm.reset();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initContact);
  } else {
    initContact();
  }
})();
