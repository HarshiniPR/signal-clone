/**
 * Layout for settings page - wraps with protected route.
 */

import ProtectedRoute from '@/components/ProtectedRoute';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}