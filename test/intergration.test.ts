import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { testCases } from "../src/cases";
import { ARM64CodeGenerator } from "../src/codegen";
import { Lexer } from "../src/Lexer";
import { Optimizer } from "../src/optimiser";
import { Parser } from "../src/parser";

/**
 * Integration test for the ARM64 compiler.
 * Supports macOS (ARM64) and Linux (ARM64) platforms.
 */
describe("ARM64 Compiler Integration Tests", () => {
  const testOutputDir = path.join(__dirname, "integration-output");

  function ensureDirExists(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  const isARM64 = process.arch === "arm64";
  const runIfARM64 = isARM64 ? it : it.skip;

  beforeAll(() => {
    ensureDirExists(testOutputDir);
  });

  function compileToAssembly(
    sourceCode: string,
    outputFileName: string,
    optimised: boolean,
  ): string {
    const outputPath = path.join(testOutputDir, outputFileName);

    const lexer = new Lexer().load(sourceCode);
    const tokens = lexer.run();
    const parser = new Parser().load(tokens);
    let program = parser.run();
    if (optimised) {
      program = new Optimizer().load(program).run().asm;
    }
    const codeGen = new ARM64CodeGenerator().load(program);
    const assembly = codeGen.run();

    fs.writeFileSync(outputPath, assembly);
    return outputPath;
  }

  async function compileAndRun(
    sourceCode: string,
    testName: string,
    optimised: boolean,
  ): Promise<string> {
    const assemblyPath = compileToAssembly(
      sourceCode,
      `${testName}.s`,
      optimised,
    );
    const objectPath = path.join(testOutputDir, `${testName}.o`);
    const executablePath = path.join(testOutputDir, testName);

    if (process.platform === "darwin") {
      execSync(`as -o ${objectPath} ${assemblyPath}`, { stdio: "inherit" });
    } else if (process.platform === "linux") {
      try {
        execSync(`as -o ${objectPath} ${assemblyPath}`, { stdio: "inherit" });
      } catch (error) {
        execSync(`aarch64-linux-gnu-as -o ${objectPath} ${assemblyPath}`, {
          stdio: "inherit",
        });
      }
    } else {
      throw new Error(`Unsupported platform: ${process.platform}`);
    }

    if (process.platform === "darwin") {
      execSync(
        `ld -o ${executablePath} ${objectPath} -lSystem -syslibroot $(xcrun -sdk macosx --show-sdk-path) -e _main -arch arm64`,
        { stdio: "inherit" },
      );
    } else if (process.platform === "linux") {
      try {
        execSync(`gcc -o ${executablePath} ${objectPath}`, {
          stdio: "inherit",
        });
      } catch (error) {
        execSync(
          `ld -o ${executablePath} ${objectPath} -lc --dynamic-linker=/lib/ld-linux-aarch64.so.1 -e main`,
          { stdio: "inherit" },
        );
      }
    } else {
      throw new Error(`Unsupported platform: ${process.platform}`);
    }

    return execSync(executablePath).toString().trim();
  }

  runIfARM64(
    "should compile and execute a comprehensive program with all language features",
    async () => {
      let i = 1;
      for (const sample of testCases) {
        const sanitizedTestName = `sample_test_${i}`;
        const sanitizedOptimizedTestName = `sample_test_optimized_${i}`;

        const output = await compileAndRun(
          sample.code,
          sanitizedTestName,
          false,
        );
        const outputOptimised = await compileAndRun(
          sample.code,
          sanitizedOptimizedTestName,
          true,
        );

        // Expect the output to be the same for both
        expect(output).toBe(sample.output.toString());
        expect(outputOptimised).toBe(sample.output.toString());
        i++;
      }
    },
  );
});
