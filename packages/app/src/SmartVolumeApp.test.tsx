import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { repository } from '@smartvolume/storage/repository';
import { SmartVolumeApp } from './SmartVolumeApp';

describe('SmartVolumeApp', () => {
  beforeEach(async () => repository.deleteAll());

  it('explains local processing before requesting microphone access', async () => {
    render(<SmartVolumeApp />);
    expect(await screen.findByText(/without recording you/i)).toBeInTheDocument();
    expect(screen.getByText(/Raw audio is never saved/i)).toBeInTheDocument();
  });

  it('opens the product dashboard after onboarding', async () => {
    render(<SmartVolumeApp />);
    fireEvent.click(await screen.findByRole('button', { name: 'Continue' }));
    expect(screen.getByText('SmartVolume')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Analyze for 5 seconds/i })).toBeInTheDocument();
  });
});
