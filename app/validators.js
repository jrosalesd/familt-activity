// app/validators.js
function validatePin(pin) {
  if (!/^\d+$/.test(pin))        return 'PIN must contain only numbers.';
  if (pin.length < 4)            return 'PIN must be at least 4 digits.';
  if (pin.length > 8)            return 'PIN must be no more than 8 digits.';
  return null; // valid
}

module.exports = { validatePin };