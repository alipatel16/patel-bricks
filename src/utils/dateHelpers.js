/**
 * Date utility functions for the brick production app
 */

// Format date for display
export const formatDate = (date, format = 'short') => {
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const options = {
    short: { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    },
    long: { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    },
    time: { 
      hour: '2-digit', 
      minute: '2-digit' 
    },
    datetime: { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    },
    iso: null, // Will return ISO string
  };

  if (format === 'iso') {
    return dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  return dateObj.toLocaleDateString('en-US', options[format] || options.short);
};

// Format time for display
export const formatTime = (date) => {
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Time';
  }

  return dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Format date and time together
export const formatDateTime = (date) => {
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid DateTime';
  }

  return dateObj.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Get relative time (e.g., "2 hours ago")
export const getRelativeTime = (date) => {
  const dateObj = new Date(date);
  const now = new Date();
  const diffInMs = now - dateObj;
  
  if (isNaN(dateObj.getTime()) || diffInMs < 0) {
    return 'Invalid Date';
  }

  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute₹{diffInMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  } else if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks !== 1 ? 's' : ''} ago`;
  } else if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
  } else {
    return `${diffInYears} year${diffInYears !== 1 ? 's' : ''} ago`;
  }
};

// Get start and end dates for different periods
export const getDateRange = (period, customStart = null, customEnd = null) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  if (period === 'custom' && customStart && customEnd) {
    return {
      start: new Date(customStart),
      end: new Date(customEnd),
    };
  }

  let start, end;

  switch (period) {
    case 'today':
      start = new Date(today);
      end = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
      break;

    case 'yesterday':
      start = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      end = new Date(today.getTime() - 1);
      break;

    case 'week':
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
      start = startOfWeek;
      end = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      break;

    case 'last_week':
      const lastWeekStart = new Date(today);
      lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
      start = lastWeekStart;
      end = new Date(lastWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      break;

    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;

    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;

    case 'quarter':
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), quarterStart, 1);
      end = new Date(now.getFullYear(), quarterStart + 3, 0, 23, 59, 59, 999);
      break;

    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;

    case 'last_year':
      start = new Date(now.getFullYear() - 1, 0, 1);
      end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      break;

    case 'last_7_days':
      start = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
      end = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
      break;

    case 'last_30_days':
      start = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
      end = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
      break;

    case 'last_90_days':
      start = new Date(today.getTime() - 89 * 24 * 60 * 60 * 1000);
      end = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
      break;

    default:
      // Default to current month
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  return { start, end };
};

// Get previous period for comparison
export const getPreviousPeriod = (period, customStart = null, customEnd = null) => {
  const current = getDateRange(period, customStart, customEnd);
  const duration = current.end - current.start;

  return {
    start: new Date(current.start.getTime() - duration),
    end: new Date(current.end.getTime() - duration),
  };
};

// Generate array of dates between two dates
export const getDatesBetween = (startDate, endDate) => {
  const dates = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Normalize to start of day
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    dates.push(new Date(date));
  }

  return dates;
};

// Check if date is today
export const isToday = (date) => {
  const today = new Date();
  const checkDate = new Date(date);
  
  return (
    checkDate.getDate() === today.getDate() &&
    checkDate.getMonth() === today.getMonth() &&
    checkDate.getFullYear() === today.getFullYear()
  );
};

// Check if date is yesterday
export const isYesterday = (date) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const checkDate = new Date(date);
  
  return (
    checkDate.getDate() === yesterday.getDate() &&
    checkDate.getMonth() === yesterday.getMonth() &&
    checkDate.getFullYear() === yesterday.getFullYear()
  );
};

// Check if date is in current week
export const isThisWeek = (date) => {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  const checkDate = new Date(date);
  
  return checkDate >= startOfWeek && checkDate <= endOfWeek;
};

// Check if date is in current month
export const isThisMonth = (date) => {
  const now = new Date();
  const checkDate = new Date(date);
  
  return (
    checkDate.getMonth() === now.getMonth() &&
    checkDate.getFullYear() === now.getFullYear()
  );
};

// Add days to a date
export const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Add months to a date
export const addMonths = (date, months) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

// Add years to a date
export const addYears = (date, years) => {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
};

// Get number of days between two dates
export const getDaysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDiff = Math.abs(end - start);
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
};

// Get week number of the year
export const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

// Get month name
export const getMonthName = (monthIndex, short = false) => {
  const months = short 
    ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  return months[monthIndex] || 'Invalid Month';
};

// Get day name
export const getDayName = (dayIndex, short = false) => {
  const days = short 
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  return days[dayIndex] || 'Invalid Day';
};

// Parse date string in various formats
export const parseDate = (dateString) => {
  if (!dateString) return null;
  
  // Try different formats
  const formats = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
    /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
  ];
  
  for (const format of formats) {
    if (format.test(dateString)) {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  // Try to parse as ISO string or timestamp
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};

// Validate date
export const isValidDate = (date) => {
  return date instanceof Date && !isNaN(date.getTime());
};

// Get business days between two dates (excluding weekends)
export const getBusinessDaysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let businessDays = 0;
  
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      businessDays++;
    }
  }
  
  return businessDays;
};

// Check if date is a weekend
export const isWeekend = (date) => {
  const dayOfWeek = new Date(date).getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
};

// Get start of day
export const startOfDay = (date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

// Get end of day
export const endOfDay = (date) => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

// Get start of month
export const startOfMonth = (date) => {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
};

// Get end of month
export const endOfMonth = (date) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1, 0);
  result.setHours(23, 59, 59, 999);
  return result;
};

// Convert date to ISO string (YYYY-MM-DD)
export const toISODateString = (date) => {
  return new Date(date).toISOString().split('T')[0];
};

// Convert timestamp to date
export const timestampToDate = (timestamp) => {
  return new Date(timestamp);
};

// Convert date to timestamp
export const dateToTimestamp = (date) => {
  return new Date(date).getTime();
};