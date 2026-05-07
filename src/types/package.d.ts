/**
 * Type declarations for package.json imports
 */

declare module "*package.json" {
  const value: {
    name: string;
    version: string;
    description: string;
    [key: string]: unknown;
  };
  export default value;
}
