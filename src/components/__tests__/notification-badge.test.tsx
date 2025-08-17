import React from 'react'
import { render, screen } from '@testing-library/react'
import { NotificationBadge } from '../notification-badge'

describe('NotificationBadge', () => {
  it('renders nothing when count is 0 and showZero is false', () => {
    const { container } = render(<NotificationBadge count={0} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders badge when count is 0 and showZero is true', () => {
    render(<NotificationBadge count={0} showZero />)
    const badge = screen.getByRole('status')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('0')
  })

  it('renders correct count for single digit numbers', () => {
    render(<NotificationBadge count={5} />)
    const badge = screen.getByRole('status')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('5')
    expect(badge).toHaveAttribute('aria-label', '5 unread notifications')
  })

  it('renders correct count for double digit numbers', () => {
    render(<NotificationBadge count={42} />)
    const badge = screen.getByRole('status')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('42')
    expect(badge).toHaveAttribute('aria-label', '42 unread notifications')
  })

  it('renders "99+" for counts over default maxCount', () => {
    render(<NotificationBadge count={150} />)
    const badge = screen.getByRole('status')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('99+')
    expect(badge).toHaveAttribute('aria-label', '150 unread notifications')
  })

  it('respects custom maxCount', () => {
    render(<NotificationBadge count={250} maxCount={200} />)
    const badge = screen.getByRole('status')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('200+')
    expect(badge).toHaveAttribute('aria-label', '250 unread notifications')
  })

  it('applies custom className', () => {
    render(<NotificationBadge count={5} className="custom-class" />)
    const badge = screen.getByRole('status')
    expect(badge).toHaveClass('custom-class')
  })

  it('has correct base styling classes', () => {
    render(<NotificationBadge count={5} />)
    const badge = screen.getByRole('status')
    expect(badge).toHaveClass('bg-red-500', 'text-white', 'rounded-full')
  })

  it('has larger size for double digit numbers', () => {
    render(<NotificationBadge count={15} />)
    const badge = screen.getByRole('status')
    expect(badge).toHaveClass('h-5', 'w-auto', 'min-w-[20px]')
  })

  it('has smaller size for single digit numbers', () => {
    render(<NotificationBadge count={5} />)
    const badge = screen.getByRole('status')
    expect(badge).toHaveClass('h-4', 'w-4')
  })
})