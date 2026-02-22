function fadeIn(element, duration = 400) {
    element.style.opacity = 0;
    element.style.display = 'block';

    let start = null;

    function animation(timestamp) {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        element.style.opacity = Math.min(progress / duration, 1);

        if (progress < duration) {
            requestAnimationFrame(animation);
        }
    }

    requestAnimationFrame(animation);
}

function fadeOut(element, duration = 400) {
    element.style.opacity = 1;

    let start = null;

    function animation(timestamp) {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        element.style.opacity = Math.max(1 - progress / duration, 0);

        if (progress < duration) {
            requestAnimationFrame(animation);
        } else {
            element.style.display = 'none';
        }
    }

    requestAnimationFrame(animation);
}

function slideIn(element, duration = 400) {
    element.style.transform = 'translateX(-100%)';
    element.style.transition = `transform ${duration}ms ease-in-out`;
    element.style.display = 'block';
    requestAnimationFrame(() => {
        element.style.transform = 'translateX(0)';
    });
}

function slideOut(element, duration = 400) {
    element.style.transition = `transform ${duration}ms ease-in-out`;
    element.style.transform = 'translateX(-100%)';
    setTimeout(() => {
        element.style.display = 'none';
    }, duration);
}

export { fadeIn, fadeOut, slideIn, slideOut };