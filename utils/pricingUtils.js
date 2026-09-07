 const calculateBookingPrice = (monthlyPrice, durationMonths, library, couponDiscountPercent = 0) => {
  const durationDiscountPercent = library.settings?.durationDiscounts?.[durationMonths] || 0;
  const totalDiscountPercent = Math.min(durationDiscountPercent + couponDiscountPercent, 100);
  const rawTotal = monthlyPrice * durationMonths;
  const total = rawTotal * (1 - totalDiscountPercent / 100);
  return Math.round(total);
};

module.exports = { calculateBookingPrice };