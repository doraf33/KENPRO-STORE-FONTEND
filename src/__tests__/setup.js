// Vitest setup — importé avant chaque fichier de test
import '@testing-library/jest-dom';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server';

// Mock Service Worker — démarrer avant les tests, fermer après
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => { cleanup(); server.resetHandlers(); });
afterAll(() => server.close());

// Supprimer les avertissements React sur les act() en test
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
