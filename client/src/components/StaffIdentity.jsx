import React from 'react';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = {
  faculty: 'Faculty',
  hod: 'Head of Department',
  principal: 'Principal',
  admin: 'Administrator',
  super_admin: 'Administrator',
  demo_admin: 'Administrator',
};

const DEPARTMENT_ROLES = ['faculty', 'hod'];

export const staffRoleLabel = (role) => {
  if (ROLE_LABELS[role]) return ROLE_LABELS[role];
  if (!role) return '';
  return role.replace(/_/g, ' ');
};

export default function StaffIdentity() {
  const { user } = useAuth();

  if (!user) return null;

  const roleLabel = staffRoleLabel(user.role);
  const department = (user.staffDepartment || user.department || '').trim();
  const showDepartment = DEPARTMENT_ROLES.includes(user.role);

  return (
    <p className="staff-identity">
      <span className="staff-identity-name">{user.name}</span>
      {roleLabel ? <span className="staff-identity-role">{roleLabel}</span> : null}
      {showDepartment ? (
        department ? (
          <span className="staff-identity-department">Department: {department}</span>
        ) : (
          <span className="staff-identity-department staff-identity-missing">Department not set</span>
        )
      ) : null}
    </p>
  );
}
