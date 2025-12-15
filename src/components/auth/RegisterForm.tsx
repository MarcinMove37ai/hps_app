// src/components/auth/RegisterForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Lista kodów kierunkowych krajów
const countryCodes = [
  { code: '+48', country: 'Polska' },
  { code: '+49', country: 'Niemcy' },
  { code: '+44', country: 'Wielka Brytania' },
  { code: '+33', country: 'Francja' },
  { code: '+39', country: 'Włochy' },
  { code: '+34', country: 'Hiszpania' },
  { code: '+1', country: 'USA/Kanada' },
  { code: '+380', country: 'Ukraina' },
  { code: '+370', country: 'Litwa' },
  { code: '+420', country: 'Czechy' },
  { code: '+421', country: 'Słowacja' },
];

// Typ dla stanu rejestracji
type RegistrationState = 'form' | 'verification' | 'success';

const RegisterForm = () => {
  // Stan zawierający dane formularza
  const [formData, setFormData] = useState({
    supervisorCode: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Stan dla kodu kierunkowego
  const [countryCode, setCountryCode] = useState('+48');

  // Stan walidacji numeru telefonu
  const [isPhoneValid, setIsPhoneValid] = useState(false);

  // Stan dla kodu weryfikacyjnego
  const [verificationCode, setVerificationCode] = useState('');

  // Stan błędów formularza
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Stan weryfikacji kodu opiekuna
  const [codeVerified, setCodeVerified] = useState<boolean | null>(null);
  const [codeDescription, setCodeDescription] = useState<string | null>(null);
  const [isCodeVerifying, setIsCodeVerifying] = useState(false);

  // Stan procesu rejestracji
  const [registrationState, setRegistrationState] = useState<RegistrationState>('form');

  // Hook autoryzacji
  const { register, confirmRegistration, resendVerificationCode, loading, error, isAuthenticated } = useAuth();
  const router = useRouter();

  // Sprawdzanie czy użytkownik jest zalogowany
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/home');
    }
  }, [isAuthenticated, router]);

  // Nie renderuj formularza jeśli użytkownik jest zalogowany
  if (isAuthenticated) {
    return null;
  }

  // Obsługa zmiany pól formularza
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Specjalna obsługa dla numeru telefonu - tylko cyfry, maksymalnie 9
    if (name === 'phoneNumber') {
      const phoneValue = value.replace(/\D/g, '').slice(0, 9);
      setFormData(prev => ({ ...prev, [name]: phoneValue }));

      // Walidacja numeru telefonu w czasie rzeczywistym
      setIsPhoneValid(phoneValue.length === 9);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Usuń błąd dla tego pola, gdy użytkownik zacznie korygować wartość
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Zresetuj status weryfikacji kodu opiekuna przy jego zmianie
    if (name === 'supervisorCode') {
      setCodeVerified(null);
      setCodeDescription(null);
    }
  };

  // Obsługa zmiany kodu kierunkowego
  const handleCountryCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCountryCode(e.target.value);
  };

  // Obsługa zmiany kodu weryfikacyjnego
  const handleVerificationCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVerificationCode(e.target.value);

    // Usuń błąd kodu weryfikacyjnego, gdy użytkownik zacznie korygować wartość
    if (errors.verificationCode) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.verificationCode;
        return newErrors;
      });
    }
  };

  // Funkcja weryfikacji kodu opiekuna
  const verifySupervisorCode = async () => {
    if (!formData.supervisorCode) {
      setErrors(prev => ({ ...prev, supervisorCode: 'Kod opiekuna jest wymagany' }));
      return;
    }

    setIsCodeVerifying(true);

    try {
      // Wywołanie API do weryfikacji kodu
      const response = await fetch('/api/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: formData.supervisorCode }),
      });

      const data = await response.json();
      setCodeVerified(data.valid);

      if (data.valid && data.description) {
        setCodeDescription(data.description);
      } else {
        setCodeDescription(null);
      }

      if (!data.valid) {
        setErrors(prev => ({ ...prev, supervisorCode: 'Nieprawidłowy kod opiekuna' }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.supervisorCode;
          return newErrors;
        });
      }
    } catch (err) {
      console.error(err);
      setErrors(prev => ({ ...prev, supervisorCode: 'Błąd weryfikacji kodu' }));
      setCodeVerified(false);
      setCodeDescription(null);
    } finally {
      setIsCodeVerifying(false);
    }
  };

  // Funkcja walidacji formularza rejestracyjnego
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Sprawdzenie kodu opiekuna
    if (!formData.supervisorCode) {
      newErrors.supervisorCode = 'Kod opiekuna jest wymagany';
    } else if (codeVerified === false) {
      newErrors.supervisorCode = 'Nieprawidłowy kod opiekuna';
    }

    // Sprawdzenie imienia
    if (!formData.firstName) {
      newErrors.firstName = 'Imię jest wymagane';
    }

    // Sprawdzenie nazwiska
    if (!formData.lastName) {
      newErrors.lastName = 'Nazwisko jest wymagane';
    }

    // Sprawdzenie numeru telefonu
    if (!formData.phoneNumber) {
      newErrors.phoneNumber = 'Numer telefonu jest wymagany';
    } else if (formData.phoneNumber.length !== 9) {
      newErrors.phoneNumber = 'Numer telefonu musi składać się z dokładnie 9 cyfr';
    }

    // Sprawdzenie adresu email
    if (!formData.email) {
      newErrors.email = 'Adres email jest wymagany';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Nieprawidłowy format adresu email';
    }

    // Sprawdzenie hasła
    if (!formData.password) {
      newErrors.password = 'Hasło jest wymagane';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Hasło musi mieć co najmniej 8 znaków';
    }

    // Sprawdzenie potwierdzenia hasła
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Hasła nie są zgodne';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Funkcja walidacji kodu weryfikacyjnego
  const validateVerificationCode = () => {
    const newErrors: Record<string, string> = {};

    if (!verificationCode || verificationCode.trim() === '') {
      newErrors.verificationCode = 'Kod weryfikacyjny jest wymagany';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Obsługa wysłania formularza rejestracyjnego
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Weryfikacja kodu opiekuna przed wysłaniem formularza
    if (codeVerified !== true) {
      await verifySupervisorCode();
      return;
    }

    try {
      // Łączenie kodu kierunkowego z numerem telefonu
      const fullPhoneNumber = `${countryCode}${formData.phoneNumber}`;

      // Rejestracja użytkownika
      const success = await register(
        formData.email,
        formData.password,
        {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: fullPhoneNumber,
          supervisorCode: formData.supervisorCode,
          email: formData.email
        }
      );

      if (success) {
        // Przejście do etapu weryfikacji email
        setRegistrationState('verification');
      }
    } catch (err) {
      console.error('Błąd rejestracji:', err);
    }
  };

  // Obsługa ponownego wysyłania kodu weryfikacyjnego
  const handleResendCode = async () => {
    try {
      const success = await resendVerificationCode(formData.email);

      if (success) {
        // Wyświetl komunikat o pomyślnym wysłaniu kodu
        alert('Kod weryfikacyjny został wysłany ponownie na podany adres email.');
      }
    } catch (err) {
      console.error('Błąd wysyłania kodu weryfikacyjnego:', err);
    }
  };

  // Obsługa wysłania formularza weryfikacji kodu
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateVerificationCode()) {
      return;
    }

    try {
      // Weryfikacja kodu
      const success = await confirmRegistration(formData.email, verificationCode);

      if (success) {
        // Przejście do ekranu sukcesu
        setRegistrationState('success');
      }
    } catch (err) {
      console.error('Błąd weryfikacji kodu:', err);
    }
  };

  // Renderowanie formularza rejestracyjnego
  const renderRegistrationForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Kod opiekuna */}
      <div>
        <label htmlFor="supervisorCode" className="block text-sm font-medium text-gray-700">
          Kod opiekuna *
        </label>
        <div className="mt-1 flex">
          <input
            id="supervisorCode"
            name="supervisorCode"
            type="text"
            required
            value={formData.supervisorCode}
            onChange={handleChange}
            onBlur={verifySupervisorCode}
            className={`appearance-none block w-full px-3 py-2 border ${
              errors.supervisorCode
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : codeVerified
                  ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            } rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm text-gray-900`}
          />
          <button
            type="button"
            onClick={verifySupervisorCode}
            disabled={isCodeVerifying || !formData.supervisorCode}
            className="ml-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isCodeVerifying ? 'Weryfikacja...' : 'Weryfikuj'}
          </button>
        </div>
        {errors.supervisorCode && (
          <p className="mt-1 text-sm text-red-600">{errors.supervisorCode}</p>
        )}
        {codeVerified === true && (
          <p className="mt-1 text-sm text-green-600">
            Twój opiekun{codeDescription ? `: ${codeDescription}` : ''}
          </p>
        )}
      </div>

      {/* Imię i nazwisko */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
            Imię *
          </label>
          <div className="mt-1">
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              value={formData.firstName}
              onChange={handleChange}
              className={`appearance-none block w-full px-3 py-2 border ${
                errors.firstName ? 'border-red-300' : 'border-gray-300'
              } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900`}
            />
          </div>
          {errors.firstName && (
            <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
          )}
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
            Nazwisko *
          </label>
          <div className="mt-1">
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              value={formData.lastName}
              onChange={handleChange}
              className={`appearance-none block w-full px-3 py-2 border ${
                errors.lastName ? 'border-red-300' : 'border-gray-300'
              } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900`}
            />
          </div>
          {errors.lastName && (
            <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
          )}
        </div>
      </div>

      {/* Telefon - podzielony na dwa bloki */}
      <div>
        <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
          Numer telefonu *
        </label>
        <div className="mt-1 flex gap-2">
          {/* Pierwszy blok - wybór numeru kierunkowego */}
          <div className="w-16 relative">
            <select
              id="countryCode"
              value={countryCode}
              onChange={handleCountryCodeChange}
              className="appearance-none block w-full px-1 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 text-center pr-6"
            >
              {countryCodes.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.code}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-gray-700">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          {/* Drugi blok - wprowadzanie numeru telefonu */}
          <div className="flex-1 relative">
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="text"
              required
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="Wprowadź 9 cyfr"
              className={`appearance-none block w-full px-3 py-2 border ${
                errors.phoneNumber
                  ? 'border-red-300'
                  : isPhoneValid
                    ? 'border-green-300'
                    : 'border-gray-300'
              } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 ${
                isPhoneValid ? 'pr-10' : ''
              }`}
            />
            {/* Ikona potwierdzająca poprawność numeru */}
            {isPhoneValid && (
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-green-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </div>
        </div>
        {errors.phoneNumber && (
          <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">Wprowadź 9-cyfrowy numer telefonu bez numeru kierunkowego</p>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Adres email *
        </label>
        <div className="mt-1">
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            className={`appearance-none block w-full px-3 py-2 border ${
              errors.email ? 'border-red-300' : 'border-gray-300'
            } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900`}
          />
        </div>
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
        )}
      </div>

      {/* Hasło */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Hasło *
        </label>
        <div className="mt-1">
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            className={`appearance-none block w-full px-3 py-2 border ${
              errors.password ? 'border-red-300' : 'border-gray-300'
            } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900`}
          />
        </div>
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password}</p>
        )}
      </div>

      {/* Potwierdzenie hasła */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          Potwierdź hasło *
        </label>
        <div className="mt-1">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={handleChange}
            className={`appearance-none block w-full px-3 py-2 border ${
              errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
            } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900`}
          />
        </div>
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
        )}
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={loading || codeVerified !== true}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Rejestracja...' : 'Zarejestruj się'}
        </button>
      </div>
    </form>
  );

  // Renderowanie formularza weryfikacji kodu
  const renderVerificationForm = () => (
    <form onSubmit={handleVerifyCode} className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded relative">

        <p className="text-sm mt-1">
          Na adres email <span className="font-bold text-green-600">{formData.email}</span> został wysłany kod weryfikacyjny.
          Proszę sprawdzić skrzynkę odbiorczą (lub folder SPAM) i wprowadzić otrzymany kod poniżej.
        </p>
      </div>

      {/* Kod weryfikacyjny */}
      <div>
        <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700">
          Kod weryfikacyjny *
        </label>
        <div className="mt-1">
          <input
            id="verificationCode"
            name="verificationCode"
            type="text"
            required
            value={verificationCode}
            onChange={handleVerificationCodeChange}
            className={`appearance-none block w-full px-3 py-2 border ${
              errors.verificationCode ? 'border-red-300' : 'border-gray-300'
            } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900`}
            placeholder="Wprowadź 6-cyfrowy kod"
          />
        </div>
        {errors.verificationCode && (
          <p className="mt-1 text-sm text-red-600">{errors.verificationCode}</p>
        )}
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Weryfikacja...' : 'Zweryfikuj konto'}
        </button>
      </div>

      <div className="text-center mt-2">
        <button
          type="button"
          onClick={handleResendCode}
          disabled={loading}
          className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
        >
          Wyślij kod ponownie
        </button>
      </div>
    </form>
  );

  // Renderowanie ekranu sukcesu po pomyślnej weryfikacji
  const renderSuccessMessage = () => (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
        <p className="font-medium">Konto zostało pomyślnie zweryfikowane!</p>
        <p className="text-sm mt-1">
          Twoje konto zostało pomyślnie utworzone i zweryfikowane. Możesz teraz zalogować się do systemu.
        </p>
      </div>

      <div className="pt-2">
        <Link href="/login" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          Przejdź do logowania
        </Link>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <hr className="mb-4 border-t border-gray-200" />
        <h2 className="text-2xl font-bold text-gray-900">
          {registrationState === 'form' ? 'Rejestracja' :
           registrationState === 'verification' ? 'Weryfikacja konta' :
           'Rejestracja zakończona'}
        </h2>
        <hr className="mt-4 border-t border-gray-200" />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative">
          {error}
        </div>
      )}

      {registrationState === 'form' && renderRegistrationForm()}
      {registrationState === 'verification' && renderVerificationForm()}
      {registrationState === 'success' && renderSuccessMessage()}

      {registrationState === 'form' && (
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Masz już konto?{' '}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              Zaloguj się
            </Link>
          </p>
        </div>
      )}
    </div>
  );
};

export default RegisterForm;