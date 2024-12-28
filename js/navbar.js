console.log("JS Loaded")

const navbarToggler = document.querySelector(".navbar-toggler")
navbarToggler.addEventListener("click", navbarChange)
function navbarChange() {
    document.querySelector(".navbar-toggler-custom-icon").classList.toggle("change");
}