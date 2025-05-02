document.addEventListener('DOMContentLoaded', function() {

    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    // You might need to toggle .nav-right as well depending on your final mobile layout
    // const navRight = document.querySelector('.nav-right');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            // Toggle the 'active' class on the menu
            navMenu.classList.toggle('active');

            // Optional: Toggle a class on the body to prevent scrolling when the menu is open
            // document.body.classList.toggle('menu-open');

            // Optional: Toggle visibility for nav-right if it's part of the mobile menu
            // if (navRight) {
            //     navRight.classList.toggle('active');
            // }
        });
    }

    // --- Add other simple JS interactions here if needed ---
    // Example: Close menu if clicking outside (more advanced)
    // document.addEventListener('click', function(event) {
    //     const isClickInsideNav = navMenu.contains(event.target);
    //     const isClickOnToggle = menuToggle.contains(event.target);
    //
    //     if (!isClickInsideNav && !isClickOnToggle && navMenu.classList.contains('active')) {
    //         navMenu.classList.remove('active');
    //         // if (navRight) navRight.classList.remove('active');
    //         // document.body.classList.remove('menu-open');
    //     }
    // });

});