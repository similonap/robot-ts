import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleNameMapper: {
        '^@/lib/(.*)$': '<rootDir>/src/$1',
    },
    testMatch: [
        "**/tests/**/*.test.ts"
    ],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: 'tsconfig.json',
        }],
    },
};

export default config;
