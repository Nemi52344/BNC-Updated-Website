
// let slideIndex = 1;
// const totalSlides = 3;

// function autoSlide() {
//     slideIndex++;
//     if (slideIndex > totalSlides) {
//         slideIndex = 1;
//     }
//     document.getElementById("img-" + slideIndex).checked = true;
// }

// setInterval(autoSlide, 5000);

// function changeColor(color) {
//     let imgElementDesktop = document.querySelector(".desktop");
//     let imgElementMobile = document.querySelector(".mobile-view");

//     let imagePaths = {
//         'white': '/assets/img/perfetto_v2/white.png',
//         '#9E2F2E': '/assets/img/perfetto_v2/red.png',
//         '#2D336B': '/assets/img/perfetto_v2/blue.png',
//         '#315743': '/assets/img/perfetto_v2/green.png'
//     };

//     let imagePathsMobile = {
//         'white': '/assets/img/perfetto_v2/mobile-white.png',
//         '#9E2F2E': '/assets/img/perfetto_v2/mobile-red.png',
//         '#2D336B': '/assets/img/perfetto_v2/mobile-blue.png',
//         '#315743': '/assets/img/perfetto_v2/mobile-green.png'
//     };

//     // Transition both images, only one is visible
//     // imgElementDesktop.style.transition = 'opacity 0.1s';
//     // imgElementMobile.style.transition = 'opacity 0.1s';

//     // imgElementDesktop.style.opacity = 0;
//     // imgElementMobile.style.opacity = 0;

//     setTimeout(() => {
//         imgElementDesktop.src = imagePaths[color];
//         imgElementMobile.src = imagePathsMobile[color];

//         imgElementDesktop.style.opacity = 1;
//         imgElementMobile.style.opacity = 1;
//     }, 200); // slight delay for fade effect
// }


function changeColor(color) {
    let imgElementDesktop = document.querySelector(".changing-image");
    let imgElementMobile = document.querySelector(".mobile-view");

    let imagePaths = {
        'white': '/assets/img/perfetto_v2/white.png',
        '#9E2F2E': '/assets/img/perfetto_v2/red.png',
        '#2D336B': '/assets/img/perfetto_v2/blue.png',
        '#315743': '/assets/img/perfetto_v2/green.png'
    };

    let imagePathsMobile = {
        'white': '/assets/img/perfetto_v2/mobile-white.png',
        '#9E2F2E': '/assets/img/perfetto_v2/mobile-red.png',
        '#2D336B': '/assets/img/perfetto_v2/mobile-blue.png',
        '#315743': '/assets/img/perfetto_v2/mobile-green.png'
    };

    // Adding opacity transition for desktop image
    // imgElementDesktop.style.transition = 'opacity 0.3s';
    // imgElementMobile.style.transition = 'opacity 0.3s';

    // Fade out images
    // imgElementDesktop.style.opacity = 0;
    // imgElementMobile.style.opacity = 0;

    setTimeout(() => {
        // Update image sources
        imgElementDesktop.src = imagePaths[color];
        imgElementMobile.src = imagePathsMobile[color];

        // Fade images back in
        imgElementDesktop.style.opacity = 1;
        imgElementMobile.style.opacity = 1;
    }, 1); // Delay to match transition time (adjust if needed)
    
    // Debugging
}




