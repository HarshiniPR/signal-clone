/**
 * Layout for profile page - wraps with protected route.
 */

import ProtectedRoute from '@/components/ProtectedRoute';

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}