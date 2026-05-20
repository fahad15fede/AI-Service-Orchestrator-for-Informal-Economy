import React, { useState } from 'react';
import { Phone, Shield, ArrowRight, Lock, UserCheck, Wrench } from 'lucide-react';

interface AuthProps {
  onLoginSuccess: (user: { role: 'client' | 'provider'; phone: string; name: string; providerId?: string }) => void;
  providers: Array<{ id: string; name: string; phone: string; avatar: string; categoryName: string }>;
}

export default function Auth({ onLoginSuccess, providers }: AuthProps) {
  const [role, setRole] = useState<'client' | 'provider'>('client');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [sentOtpCode, setSentOtpCode] = useState('');
  const [otpNotification, setOtpNotification] = useState('');
  const [error, setError] = useState('');

  const generateOTP = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const isValidPakistaniNumber = (num: string) => {
    const clean = num.replace(/[\s\-\(\)\+]/g, '');
    const regex = /^(?:92|0)?3[0-9]{9}$/;
    return regex.test(clean);
  };

  const normalizeTo10Digits = (num: string) => {
    const clean = num.replace(/[\s\-\(\)\+]/g, '');
    if (clean.startsWith('923') && clean.length === 12) {
      return clean.slice(2);
    }
    if (clean.startsWith('03') && clean.length === 11) {
      return clean.slice(1);
    }
    if (clean.startsWith('3') && clean.length === 10) {
      return clean;
    }
    return clean;
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanPhone = phone.trim();
    if (!isValidPakistaniNumber(cleanPhone)) {
      setError('Please enter a valid Pakistani mobile number (e.g., 0300 1234567 or +92 321 9876543).');
      return;
    }

    if (role === 'provider') {
      const inputDigits = normalizeTo10Digits(cleanPhone);
      const matchedProvider = providers.find(
        (p) => normalizeTo10Digits(p.phone) === inputDigits
      );

      if (!matchedProvider) {
        setError('This phone is not registered in the Provider Registry database. (Please use an active provider number, e.g. 0300 1234567)');
        return;
      }
    }

    const code = generateOTP();
    setSentOtpCode(code);
    setOtpNotification(`📢 Simulated SMS Gateway: Verification code [ ${code} ] sent to ${cleanPhone}`);
    setStep('otp');

    // Auto-clear notification after 12 seconds
    setTimeout(() => {
      setOtpNotification('');
    }, 12000);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (otp !== sentOtpCode) {
      setError('Invalid OTP code. Please enter the code from the notification.');
      return;
    }

    // Success! Find details
    if (role === 'client') {
      onLoginSuccess({
        role: 'client',
        phone,
        name: 'Fahad (Client)'
      });
    } else {
      const cleanPhone = phone.trim();
      const inputDigits = normalizeTo10Digits(cleanPhone);
      const matchedProvider = providers.find(
        (p) => normalizeTo10Digits(p.phone) === inputDigits
      );

      onLoginSuccess({
        role: 'provider',
        phone,
        name: matchedProvider ? matchedProvider.name : 'Service Provider',
        providerId: matchedProvider?.id
      });
    }
  };

  const loadDemoNumber = (num: string) => {
    setPhone(num);
    setError('');
  };

  return (
    <div className="auth-overlay">
      {otpNotification && (
        <div className="sms-banner glass-panel">
          <div className="sms-banner-header">
            <span>💬 SMS GATEWAY</span>
            <span>Just Now</span>
          </div>
          <div className="sms-banner-body">{otpNotification}</div>
        </div>
      )}

      <div className="auth-card glass-panel">
        <div className="auth-header">
          <div className="auth-logo">
            <Shield size={24} style={{ color: 'var(--color-primary)' }} />
          </div>
          <h2>KariGhar AI</h2>
          <p>Service Orchestration Portal (Pakistan)</p>
        </div>

        {/* Role Selector Tabs */}
        {step === 'phone' && (
          <div className="role-selector">
            <button 
              className={`role-tab ${role === 'client' ? 'active' : ''}`}
              onClick={() => { setRole('client'); setError(''); }}
            >
              <UserCheck size={16} />
              Client Portal
            </button>
            <button 
              className={`role-tab ${role === 'provider' ? 'active' : ''}`}
              onClick={() => { setRole('provider'); setError(''); }}
            >
              <Wrench size={16} />
              Provider Portal
            </button>
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="auth-form">
            <div className="form-group">
              <label>Enter Mobile Number</label>
              <div className="input-with-icon">
                <Phone size={16} />
                <input 
                  type="text" 
                  placeholder={role === 'client' ? 'e.g. 0321 9998887' : 'e.g. 0300 1234567'} 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="auth-input"
                />
              </div>
              <p className="form-help">
                {role === 'client' 
                  ? 'Sign in to book plumbers, tutors, beauticians or AC technicians.' 
                  : 'Sign in to manage and accept incoming bookings assigned to your phone.'}
              </p>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-submit-btn">
              Send OTP Code
              <ArrowRight size={16} />
            </button>

            {/* Quick Demo Pre-fills */}
            <div className="demo-prefills">
              <span className="prefills-title">Demo Fast-Track Login:</span>
              <div className="prefills-list">
                {role === 'client' ? (
                  <button 
                    type="button" 
                    className="prefill-chip"
                    onClick={() => loadDemoNumber('03219998887')}
                  >
                    👤 Client Demo Phone
                  </button>
                ) : (
                  <>
                    <button 
                      type="button" 
                      className="prefill-chip"
                      onClick={() => loadDemoNumber('+92 300 1234567')}
                    >
                      👨‍🔧 Ali AC Repair (Provider)
                    </button>
                    <button 
                      type="button" 
                      className="prefill-chip"
                      onClick={() => loadDemoNumber('+92 333 4567890')}
                    >
                      🔧 Sajid Plumber (Provider)
                    </button>
                  </>
                )}
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="auth-form">
            <div className="form-group">
              <label>Enter 4-Digit Verification Code</label>
              <div className="input-with-icon">
                <Lock size={16} />
                <input 
                  type="text" 
                  maxLength={4}
                  placeholder="e.g. 4821" 
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="auth-input"
                  style={{ letterSpacing: 8, textAlign: 'center', fontSize: '1.25rem' }}
                />
              </div>
              <p className="form-help text-success">
                Verify the OTP simulated in the notification banner above.
              </p>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-submit-btn">
              Verify & Log In
              <ArrowRight size={16} />
            </button>

            <button 
              type="button" 
              className="auth-back-btn"
              onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
            >
              Back to Mobile Input
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
