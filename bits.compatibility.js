function checkBrowserCompatibility() {
    var compatibility = {
        speechSynthesis: false,
        speechRecognition: false,
        permissionsAPI: false,
        mediaDevices: false,
        canvasAPI: false,
        dynamicStyles: false,
        cssCustomProperties: false,
        cssColorMix: false,
        eventListeners: false,
        promises: false,
        timersAPI: false,
        rangeInput: false,
        full: false
    };

    if(typeof(localStorage) != 'undefined' && localStorage.incompatible){
        return compatibility;
    }

    // SpeechSynthesis
    if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
        compatibility.speechSynthesis = true;
    }

    // SpeechRecognition
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
        compatibility.speechRecognition = true;
    }

    // Permissions API
    if (navigator.permissions && navigator.permissions.query) {
        compatibility.permissionsAPI = true;
    }

    // MediaDevices API
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        compatibility.mediaDevices = true;
    }

    // Canvas API
    if (document.createElement && document.createElement('canvas').getContext) {
        compatibility.canvasAPI = true;
    }

    // Dynamic Stylesheet Creation
    if (document.createElement && document.head) {
        var style = document.createElement('style');
        style.type = 'text/css';
        document.head.appendChild(style);
        compatibility.dynamicStyles = true;
        document.head.removeChild(style);
    }

    // CSS Custom Properties
    if (window.CSS && CSS.supports && CSS.supports('color', 'var(--test)')) {
        compatibility.cssCustomProperties = true;
    }

    // CSS Color Mix
    if (window.CSS && CSS.supports && CSS.supports('background', 'color-mix(in srgb, red 50%, blue 50%)')) {
        compatibility.cssColorMix = true;
    }

    // Event Listeners
    if (window.addEventListener) {
        compatibility.eventListeners = true;
    }

    // Promises
    if (window.Promise && Promise.resolve) {
        compatibility.promises = true;
    }

    // Window Timers API
    if (window.setTimeout && window.clearTimeout) {
        compatibility.timersAPI = true;
    }

    // HTML5 Range Input
    if (document.createElement) {
        var input = document.createElement('input');
        input.type = 'range';
        if (input.type === 'range') {
            compatibility.rangeInput = true;
        }
    }

    // Full compatibility check
    compatibility.full = (
        compatibility.speechSynthesis &&
        compatibility.speechRecognition &&
        compatibility.permissionsAPI &&
        compatibility.mediaDevices &&
        compatibility.canvasAPI &&
        compatibility.dynamicStyles &&
        compatibility.cssCustomProperties &&
        compatibility.cssColorMix &&
        compatibility.eventListeners &&
        compatibility.promises &&
        compatibility.timersAPI &&
        compatibility.rangeInput
    );

    return compatibility;
}

function renderFallback() {
    var compat = checkBrowserCompatibility();
    if (compat.full) {
        return; // Browser is compatible, no fallback needed
    }

    // Extract site description
    var siteTitle = '';
    var siteIntro = '';
    if (document.getElementById) {
        var titleElement = document.getElementById('info-modal');
        if (titleElement) {
            var h2 = titleElement.getElementsByTagName('h2')[0];
            if (h2) {
                siteTitle = h2.innerText || h2.textContent || '';
            }
            var paragraphs = titleElement.getElementsByTagName('p');
            for (var i = 0; i < paragraphs.length; i++) {
                siteIntro += '<p>' + (paragraphs[i].innerText || paragraphs[i].textContent || '') + '</p>';
            }
        }
    }

    // Fallback HTML content
    var fallbackHtml =
        '<div class="container"><div class="error">' +
        '<h1 style="margin-bottom:0;">Browser Not Supported</h1>' +
        '<p style="margin-top:0;">Your browser does not support the features required to run this application. Modern support as of 2025 for <u>Speech Recognition and Synthesis</u> is required.</p>' +
        '</div><h2>' + siteTitle + '</h2>' +
        siteIntro +
        '<p>Please use a modern browser such as:</p>' +
        '<ul>' +
        '<li><a href="https://www.google.com/chrome/">Google Chrome</a></li>' +
        '<li><a href="https://www.mozilla.org/firefox/">Mozilla Firefox</a></li>' +
        '<li><a href="https://www.apple.com/safari/">Apple Safari</a></li>' +
        '<li><a href="https://www.microsoft.com/edge/">Microsoft Edge</a></li>' +
        '<li><a href="https://brave.com/">Brave</a></li>' +
        '<li><a href="https://www.opera.com/">Opera</a></li>' +
        '</ul>' +
        '<h2 style="color:red;">Unsupported features in your browser:</h2>' +
        '<ul style="font-size: 12px;">' +
        (!compat.speechSynthesis ? '<li>Speech Synthesis (Text-to-Speech)</li>' : '') +
        (!compat.speechRecognition ? '<li>Speech Recognition</li>' : '') +
        (!compat.permissionsAPI ? '<li>Permissions API</li>' : '') +
        (!compat.mediaDevices ? '<li>Media Devices (Microphone Access)</li>' : '') +
        (!compat.canvasAPI ? '<li>Canvas API</li>' : '') +
        (!compat.dynamicStyles ? '<li>Dynamic Stylesheet Creation</li>' : '') +
        (!compat.cssCustomProperties ? '<li>CSS Custom Properties</li>' : '') +
        (!compat.cssColorMix ? '<li>CSS Color Mix</li>' : '') +
        (!compat.eventListeners ? '<li>Event Listeners</li>' : '') +
        (!compat.promises ? '<li>Promises</li>' : '') +
        (!compat.timersAPI ? '<li>Timers (setTimeout)</li>' : '') +
        (!compat.rangeInput ? '<li>HTML5 Range Input</li>' : '') +
        '</ul>' +
        '</div>';

    // CSS for the fallback page
    var fallbackCss =
        '#body {' +
            'font-family: Arial, Helvetica, sans-serif; overflow: auto;' +
            'font-size: 18px;' +
            'margin: 10px;' +
            'background-color: #f0f0f0;' +
            'color: #000000;' +
            'text-align: left;' +
        '}' +
        '#body .error { color:red; } #body h2, #body h1 { font-weight: bold;} ' +
        '#body p {' +
            'margin: 1em 0;' +
        '}' +
        '#body ul {' +
            'list-style: auto; list-style-type: disc;' +
            'margin: 1em 0;' +
            'padding: 0 0 0 1em;' +
        '}' +
        '#body li {' +
            'margin: auto auto;' +
        '}' +
        '#body a {' +
            'color: #0000ff;' +
            'text-decoration: underline;' +
        '}' +
        '#body .container {' +
            'width: 90%;' +
            'margin: 0 auto;' +
            'background-color: #ffffff;' +
            'padding: 10px;' +
            'border: 1px solid #000000;' +
        '}';

    // Add style to head
    if (document.createElement && document.head) {
        var style = document.createElement('style');
        style.type = 'text/css';
        if (style.styleSheet) {
            style.styleSheet.cssText = fallbackCss; // IE-specific
        } else {
            style.appendChild(document.createTextNode(fallbackCss));
        }
        document.head.appendChild(style);
    }

    // Set body content using innerHTML
    document.body.innerHTML = fallbackHtml;

    // Stop further scripts if possible
    if (window.stop) {
        window.stop();
    }
}

// Run when document is ready
if (document.readyState && document.readyState === 'complete') {
    renderFallback();
} else if (window.addEventListener) {
    window.addEventListener('load', renderFallback, false);
} else if (window.attachEvent) {
    window.attachEvent('onload', renderFallback);
} else {
    renderFallback(); // Fallback for old browsers
}
