/* ==================== WEATHER APP ==================== */

// State Management
const state = {
  currentWeather: null,
  forecastData: null,
  searchResults: [],
  selectedLocation: null,
  units: {
    temperature: 'celsius',
    windSpeed: 'kmh',
    precipitation: 'mm'
  }
};

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.querySelector('.search-btn');
const searchResults = document.getElementById('searchResults');
const unitsBtn = document.querySelector('.units-btn');
const unitsMenu = document.querySelector('.units-menu');
const weatherContainer = document.getElementById('weatherContainer');
const errorContainer = document.getElementById('errorContainer');
const retryBtn = document.getElementById('retryBtn');
const currentWeatherContent = document.getElementById('currentWeatherContent');
const feelsLike = document.getElementById('feelsLike');
const humidity = document.getElementById('humidity');
const wind = document.getElementById('wind');
const precipitation = document.getElementById('precipitation');
const dailyForecast = document.getElementById('dailyForecast');
const hourlyForecast = document.getElementById('hourlyForecast');
const daySelector = document.getElementById('daySelector');
const themeToggle = document.getElementById('themeToggle');

// Weather Icons Mapping
const weatherIcons = {
  'sunny': './assets/images/icon-sunny.webp',
  'partly cloudy': './assets/images/icon-partly-cloudy.webp',
  'overcast': './assets/images/icon-overcast.webp',
  'rain': './assets/images/icon-rain.webp',
  'drizzle': './assets/images/icon-drizzle.webp',
  'snow': './assets/images/icon-snow.webp',
  'fog': './assets/images/icon-fog.webp',
  'storm': './assets/images/icon-storm.webp'
};

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
  initializeEventListeners();
  loadThemePreference();
  loadDefaultLocation();
  loadUnitsFromLocalStorage();
});

function initializeEventListeners() {
  // Search functionality
  searchBtn.addEventListener('click', handleSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });
  searchInput.addEventListener('input', (e) => {
    if (e.target.value.trim()) {
      handleSearchInput(e.target.value);
    } else {
      searchResults.classList.add('hidden');
    }
  });

  // Units
  unitsBtn.addEventListener('click', toggleUnitsMenu);
  document.addEventListener('click', closeUnitsMenuOnClickOutside);

  // Theme Toggle
  themeToggle.addEventListener('click', toggleTheme);

  // Units radio inputs
  document.querySelectorAll('input[name="temperature"]').forEach(input => {
    input.addEventListener('change', (e) => {
      state.units.temperature = e.target.value;
      saveUnitsToLocalStorage();
      updateWeatherDisplay();
    });
  });

  document.querySelectorAll('input[name="windSpeed"]').forEach(input => {
    input.addEventListener('change', (e) => {
      state.units.windSpeed = e.target.value;
      saveUnitsToLocalStorage();
      updateWeatherDisplay();
    });
  });

  document.querySelectorAll('input[name="precipitation"]').forEach(input => {
    input.addEventListener('change', (e) => {
      state.units.precipitation = e.target.value;
      saveUnitsToLocalStorage();
      updateWeatherDisplay();
    });
  });

  // Day selector for hourly forecast
  daySelector.addEventListener('change', (e) => {
    updateHourlyForecast(parseInt(e.target.value));
  });

  // Retry button
  retryBtn.addEventListener('click', () => {
    if (state.selectedLocation) {
      fetchWeatherData(state.selectedLocation);
    } else {
      loadDefaultLocation();
    }
  });
}

// ==================== THEME MANAGEMENT ====================

function toggleTheme() {
  const isDarkTheme = document.body.classList.toggle('light-theme');
  saveThemePreference(isDarkTheme);
  updateThemeIcon(isDarkTheme);
}

function loadThemePreference() {
  const isDarkTheme = localStorage.getItem('isDarkTheme') === 'false';
  if (isDarkTheme) {
    document.body.classList.add('light-theme');
    updateThemeIcon(isDarkTheme);
  }
}

function saveThemePreference(isDarkTheme) {
  localStorage.setItem('isDarkTheme', isDarkTheme);
}

function updateThemeIcon(isDarkTheme) {
  const icon = themeToggle.querySelector('.theme-icon');
  icon.textContent = isDarkTheme ? '🌙' : '☀️';
}

function toggleUnitsMenu() {
  const isHidden = unitsMenu.classList.toggle('hidden');
  unitsBtn.classList.toggle('active');
  // Update ARIA attributes for accessibility
  unitsBtn.setAttribute('aria-expanded', !isHidden);
  unitsMenu.setAttribute('aria-hidden', isHidden);
}

function closeUnitsMenuOnClickOutside(e) {
  const unitsSelector = document.querySelector('.units-selector');
  if (!unitsSelector.contains(e.target)) {
    unitsMenu.classList.add('hidden');
    unitsBtn.classList.remove('active');
  }
}

// ==================== LOCAL STORAGE ====================

function saveUnitsToLocalStorage() {
  localStorage.setItem('weatherUnits', JSON.stringify(state.units));
}

function loadUnitsFromLocalStorage() {
  const saved = localStorage.getItem('weatherUnits');
  if (saved) {
    state.units = JSON.parse(saved);
    updateUnitSelectors();
  }
}

function updateUnitSelectors() {
  document.querySelector(`input[name="temperature"][value="${state.units.temperature}"]`).checked = true;
  document.querySelector(`input[name="windSpeed"][value="${state.units.windSpeed}"]`).checked = true;
  document.querySelector(`input[name="precipitation"][value="${state.units.precipitation}"]`).checked = true;
}

// ==================== LOCATION HANDLING ====================

async function loadDefaultLocation() {
  try {
    // Try to get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchWeatherByCoordinates(latitude, longitude);
        },
        () => {
          // If permission denied, use Berlin as default
          fetchWeatherData('Berlin, Germany');
        }
      );
    } else {
      fetchWeatherData('Berlin, Germany');
    }
  } catch (error) {
    console.error('Error loading default location:', error);
    fetchWeatherData('Berlin, Germany');
  }
}

async function handleSearch() {
  const value = searchInput.value.trim();
  if (value) {
    const result = state.searchResults.find(r => r.name === value);
    if (result) {
      selectLocation(result);
    }
  }
}

async function handleSearchInput(query) {
  if (query.length < 2) {
    searchResults.classList.add('hidden');
    return;
  }

  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json`
    );
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      state.searchResults = data.results;
      displaySearchResults(data.results);
      searchResults.classList.remove('hidden');
    } else {
      searchResults.classList.add('hidden');
    }
  } catch (error) {
    console.error('Error fetching search results:', error);
    searchResults.classList.add('hidden');
  }
}

function displaySearchResults(results) {
  searchResults.innerHTML = '';
  results.slice(0, 5).forEach(result => {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    const country = result.country ? `, ${result.country}` : '';
    item.textContent = `${result.name}${country}`;
    item.addEventListener('click', () => selectLocation(result));
    searchResults.appendChild(item);
  });
}

function selectLocation(location) {
  state.selectedLocation = location;
  searchInput.value = `${location.name}${location.country ? ', ' + location.country : ''}`;
  searchResults.classList.add('hidden');
  showNotification(`📍 Loading weather for ${location.name}...`, 'info', 2000);
  fetchWeatherByCoordinates(location.latitude, location.longitude);
}

async function fetchWeatherByCoordinates(latitude, longitude) {
  try {
    // Simplified URL with basic parameters
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', latitude.toString());
    url.searchParams.set('longitude', longitude.toString());
    url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m');
    url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum');
    url.searchParams.set('hourly', 'temperature_2m,weather_code');
    url.searchParams.set('temperature_unit', 'celsius');
    url.searchParams.set('forecast_days', '7');

    const fullUrl = url.toString();
    console.log('Fetching weather from:', fullUrl);

    const response = await fetch(fullUrl);

    if (!response.ok) {
      const text = await response.text();
      console.error('Response error:', response.status, text);
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.current) {
      throw new Error('Invalid API response: missing current weather data');
    }
    
    state.forecastData = data;

    // Use selected location if available, otherwise get from reverse geocoding
    let locationName = 'Current Location';
    let country = '';

    if (state.selectedLocation) {
      locationName = state.selectedLocation.name;
      country = state.selectedLocation.country || '';
    } else {
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?latitude=${latitude}&longitude=${longitude}&format=json`
      );
      const geoData = await geoResponse.json();
      locationName = geoData.results?.[0]?.name || 'Current Location';
      country = geoData.results?.[0]?.country || '';
    }

    state.currentWeather = {
      ...data.current,
      location: locationName,
      country: country,
      time: new Date().toISOString()
    };

    updateWeatherDisplay();
    showWeatherContainer();
  } catch (error) {
    console.error('Error fetching weather data:', error);
    showError('Failed to fetch weather data. Please try again.');
  }
}

async function fetchWeatherData(location) {
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
    );
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      fetchWeatherByCoordinates(result.latitude, result.longitude);
    } else {
      showError('Location not found. Please try a different search.');
    }
  } catch (error) {
    console.error('Error fetching location:', error);
    showError('Error finding location. Please try again.');
  }
}

// ==================== WEATHER DISPLAY ====================

function updateWeatherDisplay() {
  if (!state.currentWeather || !state.forecastData) return;

  updateCurrentWeather();
  updateWeatherDetails();
  updateDailyForecast();
  updateDaySelector();
  updateHourlyForecast(0);
}

function updateCurrentWeather() {
  const weather = state.currentWeather;
  const date = new Date(weather.time);
  const dateString = formatDate(date);

  const temp = formatTemperature(weather.temperature_2m);
  const weatherDesc = getWeatherDescription(weather.weather_code);
  const iconUrl = getWeatherIcon(weather.weather_code);

  currentWeatherContent.innerHTML = `
    <div class="current-weather-main">
      <img src="${iconUrl}" alt="${weatherDesc}" class="current-weather-icon">
      <div class="current-weather-info">
        <div class="current-location">${weather.location}</div>
        <div class="current-date">${dateString}</div>
      </div>
      <div style="text-align: right;">
        <div class="current-temp">${temp}°</div>
      </div>
    </div>
  `;
}

function updateWeatherDetails() {
  const current = state.currentWeather;

  // Use temperature as feels like (API limitation)
  feelsLike.textContent = formatTemperature(current.temperature_2m) + '°';
  humidity.textContent = (current.relative_humidity_2m || '—') + '%';

  const windValue = formatWindSpeed(current.wind_speed_10m || 0);
  const windUnit = state.units.windSpeed === 'kmh' ? 'km/h' : 'mph';
  wind.textContent = `${windValue} ${windUnit}`;

  // Precipitation data from daily forecast if available
  const precipValue = state.forecastData?.daily?.precipitation_sum?.[0] || 0;
  const precipFormatted = formatPrecipitation(precipValue);
  const precipUnit = state.units.precipitation === 'mm' ? 'mm' : 'in';
  precipitation.textContent = `${precipFormatted} ${precipUnit}`;
}

function updateDailyForecast() {
  const daily = state.forecastData.daily;
  const now = new Date();
  const today = now.getDate();

  dailyForecast.innerHTML = '';

  for (let i = 0; i < daily.time.length && i < 7; i++) {
    const date = new Date(daily.time[i]);
    const dayName = getDayName(date);
    const maxTemp = formatTemperature(daily.temperature_2m_max[i]);
    const minTemp = formatTemperature(daily.temperature_2m_min[i]);
    const iconUrl = getWeatherIcon(daily.weather_code[i]);

    const card = document.createElement('div');
    card.className = 'daily-forecast-card';
    card.innerHTML = `
      <div class="daily-day">${dayName}</div>
      <img src="${iconUrl}" alt="Weather" class="daily-icon">
      <div class="daily-temps">
        <div class="daily-high">${maxTemp}°</div>
        <div class="daily-low">${minTemp}°</div>
      </div>
    `;
    dailyForecast.appendChild(card);
  }
}

function updateDaySelector() {
  const daily = state.forecastData.daily;
  daySelector.innerHTML = '';

  for (let i = 0; i < daily.time.length && i < 5; i++) {
    const date = new Date(daily.time[i]);
    const dayName = i === 0 ? 'Today' : getDayName(date);
    const option = document.createElement('option');
    option.value = i;
    option.textContent = dayName;
    daySelector.appendChild(option);
  }
}

function updateHourlyForecast(dayIndex = 0) {
  const hourly = state.forecastData.hourly;
  const daily = state.forecastData.daily;
  const dayStart = new Date(daily.time[dayIndex]);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  hourlyForecast.innerHTML = '';

  hourly.time.forEach((time, index) => {
    const date = new Date(time);
    if (date >= dayStart && date < dayEnd) {
      const hour = date.getHours();
      const temp = formatTemperature(hourly.temperature_2m[index]);
      const iconUrl = getWeatherIcon(hourly.weather_code[index]);
      const timeString = `${hour}${hour < 12 ? ' AM' : hour === 12 ? ' PM' : ' PM'}`;

      const card = document.createElement('div');
      card.className = 'hourly-forecast-card';
      card.innerHTML = `
        <div class="hourly-time">${timeString}</div>
        <img src="${iconUrl}" alt="Weather" class="hourly-icon">
        <div class="hourly-temp">${temp}°</div>
      `;
      hourlyForecast.appendChild(card);
    }
  });
}

// ==================== UTILITY FUNCTIONS ====================

function formatTemperature(celsiusTemp) {
  if (state.units.temperature === 'celsius') {
    return Math.round(celsiusTemp);
  } else {
    // Convert to Fahrenheit
    const fahrenheit = (celsiusTemp * 9 / 5) + 32;
    return Math.round(fahrenheit);
  }
}

function formatWindSpeed(kmhSpeed) {
  if (state.units.windSpeed === 'kmh') {
    return Math.round(kmhSpeed);
  } else {
    // Convert to mph
    const mph = kmhSpeed * 0.621371;
    return Math.round(mph);
  }
}

function formatPrecipitation(mmValue) {
  if (state.units.precipitation === 'mm') {
    return mmValue.toFixed(1);
  } else {
    // Convert to inches
    const inches = mmValue * 0.0393701;
    return inches.toFixed(2);
  }
}

function formatDate(date) {
  const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

function getDayName(date) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
}

function getWeatherDescription(code) {
  const descriptions = {
    0: 'sunny',
    1: 'partly cloudy',
    2: 'overcast',
    3: 'overcast',
    45: 'fog',
    48: 'fog',
    51: 'drizzle',
    53: 'drizzle',
    55: 'drizzle',
    61: 'rain',
    63: 'rain',
    65: 'rain',
    71: 'snow',
    73: 'snow',
    75: 'snow',
    77: 'snow',
    80: 'rain',
    81: 'rain',
    82: 'rain',
    85: 'snow',
    86: 'snow',
    95: 'storm',
    96: 'storm',
    99: 'storm'
  };
  return descriptions[code] || 'partly cloudy';
}

// ==================== NOTIFICATION SYSTEM ====================

function showNotification(message, type = 'info', duration = 3000) {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-message">${message}</span>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">✕</button>
    </div>
  `;
  
  // Create style if not exists
  if (!document.getElementById('notificationStyles')) {
    const style = document.createElement('style');
    style.id = 'notificationStyles';
    style.innerHTML = `
      .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1.25rem 1.75rem;
        border-radius: 1rem;
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
        animation: slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 9999;
        min-width: 280px;
        max-width: 400px;
      }

      .notification-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }

      .notification-message {
        flex: 1;
        font-weight: 500;
        font-size: 0.95rem;
      }

      .notification-close {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        font-size: 1.2rem;
        padding: 0;
        opacity: 0.7;
        transition: opacity 0.2s ease;
      }

      .notification-close:hover {
        opacity: 1;
      }

      .notification-info {
        background: linear-gradient(135deg, rgba(51, 133, 255, 0.95) 0%, rgba(79, 39, 131, 0.95) 100%);
        color: white;
      }

      .notification-success {
        background: linear-gradient(135deg, rgba(34, 197, 94, 0.95) 0%, rgba(20, 184, 166, 0.95) 100%);
        color: white;
      }

      .notification-error {
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(244, 114, 94, 0.95) 100%);
        color: white;
      }

      .notification-warning {
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.95) 0%, rgba(234, 179, 8, 0.95) 100%);
        color: white;
      }

      @media (max-width: 768px) {
        .notification {
          left: 10px;
          right: 10px;
          min-width: auto;
        }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  if (duration) {
    setTimeout(() => {
      notification.style.animation = 'fadeOut 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards';
      setTimeout(() => notification.remove(), 400);
    }, duration);
  }
}

function getWeatherIcon(code) {
  const description = getWeatherDescription(code);
  return weatherIcons[description] || weatherIcons['partly cloudy'];
}

// ==================== ERROR HANDLING ====================

function showError(message) {
  weatherContainer.classList.add('hidden');
  errorContainer.classList.remove('hidden');
  document.getElementById('errorMessage').textContent = message;
}

function showWeatherContainer() {
  weatherContainer.classList.remove('hidden');
  errorContainer.classList.add('hidden');
}