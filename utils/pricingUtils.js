// total = monthlyPrice x durationMonths x (1 - discountPercent/100), rounded to nearest rupee.
const calculateBookingPrice = (monthlyPrice, durationMonths, library) => {
  const discountPercent = library.settings?.durationDiscounts?.[durationMonths] || 0;
  const rawTotal = monthlyPrice * durationMonths;
  const total = rawTotal * (1 - discountPercent / 100);
  return Math.round(total);
};

module.exports = { calculateBookingPrice };