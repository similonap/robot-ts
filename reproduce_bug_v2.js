const ts = require('typescript');

const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;

const codeCase3 = `
  console.log("Starting Case 3 (Top Level)");
  const name = readline.question("What is your name? ");
  console.log("Hello " + name);
  await robot.moveForward();
  console.log("Finished Case 3");
`;

function transpileCode(source) {
    const autoAwaitTransformer = (context) => {
        return (sourceFile) => {
            const visitor = (node) => {
                if (ts.isCallExpression(node)) {
                    const expr = node.expression;
                    if (ts.isPropertyAccessExpression(expr) &&
                        ts.isIdentifier(expr.expression) &&
                        expr.expression.text === 'readline' &&
                        ts.isIdentifier(expr.name) &&
                        expr.name.text === 'question') {
                        return context.factory.createAwaitExpression(node);
                    }
                }
                return ts.visitEachChild(node, visitor, context);
            };
            return ts.visitNode(sourceFile, visitor);
        };
    };

    // Use ESNext to allow top level await if needed, though transpileModule is loose
    const result = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2017 },
        transformers: { before: [autoAwaitTransformer] }
    });
    return result.outputText;
}

const mockApi = {
    robot: {
        moveForward: async () => {
            console.log("Robot moving...");
            await new Promise(r => setTimeout(r, 100));
            console.log("Robot moved.");
        }
    },
    readline: {
        question: (prompt) => {
            console.log("Question asked: " + prompt);
            return new Promise(resolve => {
                setTimeout(() => {
                    console.log("Question answered (simulated)");
                    resolve("User");
                }, 100);
            });
        }
    },
    console: console,
    fetch: () => { }
};

async function runTest(code) {
    console.log("--- Transpiling ---");
    const jsCode = transpileCode(code);
    console.log(jsCode);
    console.log("--- Executing ---");

    // Use AsyncFunction
    const runFn = new AsyncFunction('robot', 'readline', 'fetch', 'console', jsCode);

    try {
        await runFn(mockApi.robot, mockApi.readline, mockApi.fetch, mockApi.console);
        console.log("Execution finished");
    } catch (e) {
        console.error("Execution error:", e);
    }
}

// Run Case 3
console.log(">>> Running Case 3");
runTest(codeCase3);
