'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth/context';
import { Lock, User, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'form'>) {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setLoading(true);

    try {
      const result = await login(username, password, rememberMe);

      if (!result.success) {
        setServerError(result.error || 'Invalid credentials');
        return;
      }

      router.push('/today');
      router.refresh();
    } catch {
      setServerError('Unable to connect to the authentication server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('font-referenceSans flex w-full flex-col gap-8', className)}
      {...props}
    >
      <div className="flex flex-col gap-2">
        <p className="flex h-[13px] items-center gap-2 text-[11px] font-semibold leading-[13px] text-[#D51E25]">
          <span className="h-px w-[18px] bg-[#D51E25]" />
          STUDIO ACCESS
        </p>
        <h1 className="font-referenceDisplay text-[40px] font-medium leading-[46px] tracking-normal text-black">
          Login to your account
        </h1>
        <p className="text-[16px] leading-[26px] text-[#2B2B2B]">
          Enter your studio credentials below to access your account
        </p>
      </div>

      {serverError && (
        <div className="flex items-start gap-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <div className="grid gap-6">
        <div className="grid gap-3">
          <Label htmlFor="username" className="font-referenceDisplay text-[18px] font-normal leading-[23px] text-black">Username</Label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-black" />
            <Input
              id="username"
              placeholder="e.g. sara"
              className="h-14 rounded-lg border-[#2B2B2B] px-4 pl-12 text-[15px] leading-[18px] text-black shadow-none placeholder:text-black focus-visible:border-[#D51E25] focus-visible:ring-[#D51E25]/20 md:text-[15px]"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
            />
          </div>
        </div>

        <div className="grid gap-3">
          <Label htmlFor="password" className="font-referenceDisplay text-[18px] font-normal leading-5 text-black">Password</Label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-black" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="h-14 rounded-lg border-[#2B2B2B] px-4 pl-12 pr-12 text-[15px] leading-[18px] text-black shadow-none placeholder:text-black focus-visible:border-[#D51E25] focus-visible:ring-[#D51E25]/20 md:text-[15px]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
            <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-4 top-1/2 flex h-[18px] w-[18px] -translate-y-1/2 items-center justify-center p-0 text-black hover:text-slate-800" aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-3 text-[14px] font-medium leading-[17px] text-[#2B2B2B]">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-[#2B2B2B] text-[#D51E25] focus:ring-[#D51E25]/20"
            />
            Remember me
          </label>

          <button type="button" className="text-[14px] font-medium leading-[17px] text-red-600 hover:text-red-700">
            Forgot your password?
          </button>
        </div>

        <Button type="submit" className="font-referenceDisplay h-16 w-full rounded-lg bg-[#D51E25] px-5 text-[18px] font-medium leading-[23px] text-[#F8F5EF] hover:bg-[#D51E25]/90" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            'Login'
          )}
        </Button>

        <p className="text-center text-[16px] leading-[24px] text-gray-600">
          Need technical support?{' '}
          <span className="text-red-700">Contact the Studio Administrator</span>
        </p>
      </div>
    </form>
  );
}
