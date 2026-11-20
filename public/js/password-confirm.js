/**
 * "Confirm password" check, used on the signup and reset-password forms.
 * Shows the browser's own "Passwords do not match" bubble before the form is sent.
 * The server checks this again; this just saves the user a round trip.
 */

document.addEventListener('DOMContentLoaded', function () {
    const password = document.getElementById('password');
    const confirm = document.getElementById('confirmPassword');
    if (!password || !confirm) return;

    function check() {
        confirm.setCustomValidity(password.value !== confirm.value ? 'Passwords do not match' : '');
    }

    confirm.addEventListener('input', check);
    password.addEventListener('input', check); // also re-check if they edit the first box
});