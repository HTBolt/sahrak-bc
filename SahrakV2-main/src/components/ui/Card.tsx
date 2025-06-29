import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  hover = false 
}) => {
  const Component = hover ? motion.div : 'div';
  const motionProps = hover ? {
    whileHover: { y: -2 },
    transition: { duration: 0.2 }
  } : {};

  return (
    <Component
      className={`
        bg-[var(--card-bg)] rounded-xl shadow-sm border border-[var(--card-border)]
        dark:bg-slate-800 dark:border-slate-700
        ${hover ? 'hover:shadow-md cursor-pointer' : ''}
        ${className}
      `}
      {...motionProps}
    >
      {children}
    </Component>
  );
};