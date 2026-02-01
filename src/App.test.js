import { render, screen } from '@testing-library/react';
import App from './App';

// Mock Firebase
jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(),
  onAuthStateChanged: jest.fn(() => () => {}),
  signInWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));
jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  collection: jest.fn(),
}));
jest.mock("./context/FirebaseContext", () => ({
  auth: {},
  db: {},
}));

test('renders Zaptockz CRM title', () => {
  render(<App />);
  const linkElement = screen.getByText(/Sign in to your Account/i);
  expect(linkElement).toBeInTheDocument();
});
