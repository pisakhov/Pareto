// Pareto Home Page JavaScript
document.addEventListener('DOMContentLoaded', function() {

    // Simple welcome page initialization
    initializeWelcomePage();
});

function initializeWelcomePage() {
    // Add subtle fade-in animation to main content
    const mainContent = document.querySelector('main');
    if (mainContent) {
        mainContent.style.opacity = '0';
        mainContent.style.transition = 'opacity 0.6s ease-in';

        setTimeout(() => {
            mainContent.style.opacity = '1';
        }, 100);
    }

    // Smooth scroll for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', handleSmoothScroll);
    });
}

function handleSmoothScroll(event) {
    event.preventDefault();
    const targetId = event.currentTarget.getAttribute('href');
    const targetElement = document.querySelector(targetId);

    if (targetElement) {
        targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}