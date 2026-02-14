(function () {
    'use strict';

    var VIEWPORT_ID = 'app-viewport';
    var SPLIT_CLASS = 'is-split';

    var viewport = document.getElementById(VIEWPORT_ID);
    var bubbleTrigger = document.querySelector('[data-next-step]');
    var backBtn = document.querySelector('[data-back]');
    var uploadBtn = document.querySelector('.action-btn--upload');
    var fileInput = document.querySelector('.action-btn__file');
    var jobDescTextarea = document.getElementById('job-description');
    var charCounter = document.querySelector('.char-counter');
    var MAX_LENGTH = 3000;

    if (!viewport || !bubbleTrigger) return;

    // Mitosis: click central bubble → split into actions (Join, Upload, Job title)
    bubbleTrigger.addEventListener('click', function () {
        viewport.classList.add(SPLIT_CLASS);
        viewport.setAttribute('aria-flow', 'split');
        var splitStage = document.querySelector('[data-flow="split"]');
        if (splitStage) splitStage.setAttribute('aria-hidden', 'false');
    });

    // Back: return to previous step (bubble view)
    if (backBtn) {
        backBtn.addEventListener('click', function () {
            viewport.classList.remove(SPLIT_CLASS);
            viewport.removeAttribute('aria-flow');
            var splitStage = document.querySelector('[data-flow="split"]');
            if (splitStage) splitStage.setAttribute('aria-hidden', 'true');
        });
    }

    // Upload resume: clicking the button opens the file picker
    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', function () {
            fileInput.click();
        });
        fileInput.addEventListener('change', function () {
            if (this.files && this.files.length) {
                console.log('Resume selected:', this.files[0].name);
                // Add your upload logic here (e.g. FormData, fetch)
            }
            this.value = '';
        });
    }

    // Job Description: 0/3000 character counter
    if (jobDescTextarea && charCounter) {
        function updateCounter() {
            charCounter.textContent = jobDescTextarea.value.length + '/' + MAX_LENGTH;
        }
        jobDescTextarea.addEventListener('input', updateCounter);
        jobDescTextarea.addEventListener('paste', function () { setTimeout(updateCounter, 0); });
        updateCounter();
    }
})();
