import "@testing-library/jest-dom";

// Mock localStorage if not already present
if (typeof window !== "undefined") {
  const store: Record<string, string> = {};
  const mockStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k in store) delete store[k];
    },
  };

  Object.defineProperty(window, "localStorage", {
    value: mockStorage,
  });

  Object.defineProperty(window, "sessionStorage", {
    value: mockStorage,
  });
}
