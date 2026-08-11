
(() => {
  'use strict'

  
  const forms = document.querySelectorAll('.needs-validation')

  
  Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault()
        event.stopPropagation()
      }

      form.classList.add('was-validated')
    }, false)
  })
})()

const filters = document.querySelector(".filters");
const leftBtn = document.querySelector(".left-btn");
const rightBtn = document.querySelector(".right-btn");

if (filters && leftBtn && rightBtn) {

    rightBtn.addEventListener("click", () => {
        filters.scrollBy({
            left: 250,
            behavior: "smooth",
        });
    });

    leftBtn.addEventListener("click", () => {
        filters.scrollBy({
            left: -250,
            behavior: "smooth",
        });
    });

}