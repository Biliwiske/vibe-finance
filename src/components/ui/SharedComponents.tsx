import React from 'react';
import { tokens } from '../../designTokens';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function Card({ children, className = '', noPadding = false, ...props }: CardProps) {
  return (
    <div 
      className={`${tokens.components.card} ${noPadding ? '' : tokens.components.cardInner} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '', ...props }: CardHeaderProps) {
  return (
    <div className={`${tokens.components.cardHeader} ${className}`} {...props}>
      {children}
    </div>
  );
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: 'income' | 'expense' | 'warning' | 'neutral';
  className?: string;
}

export function Badge({ children, variant = 'neutral', className = '', ...props }: BadgeProps) {
  const variantClass = tokens.colors[variant]?.badge || tokens.colors.neutral.badge;
  return (
    <span className={`${tokens.components.badgeBase} ${variantClass} ${className}`} {...props}>
      {children}
    </span>
  );
}

export interface MetricNumberProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'item';
  className?: string;
  status?: 'income' | 'expense' | 'warning' | 'neutral';
}

export function MetricNumber({ value, variant = 'primary', className = '', status, ...props }: MetricNumberProps) {
  const sizeClass = 
    variant === 'primary' 
      ? tokens.typography.kpiPrimary 
      : variant === 'secondary' 
      ? tokens.typography.kpiSecondary 
      : tokens.typography.itemNumber;

  const colorClass = status ? tokens.colors[status].text : '';

  return (
    <span className={`${sizeClass} ${colorClass} ${className}`} {...props}>
      {value}
    </span>
  );
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  className?: string;
}

export function Button({ children, variant = 'primary', className = '', ...props }: ButtonProps) {
  const variantClass = 
    variant === 'primary' 
      ? tokens.components.buttonPrimary 
      : variant === 'secondary' 
      ? tokens.components.buttonSecondary 
      : variant === 'danger' 
      ? tokens.components.buttonDanger 
      : tokens.components.buttonGhost;

  return (
    <button className={`${variantClass} ${className}`} {...props}>
      {children}
    </button>
  );
}
