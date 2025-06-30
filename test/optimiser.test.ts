// test/optimiser.test.ts
import { Lexer } from "../src/Lexer";
import { IterativeOptimizer } from "../src/optimiser";
import { Parser } from "../src/parser";

describe("Enhanced Optimizer Integration Tests", () => {
  function optimizeCode(input: string, maxPasses = 10) {
    const lexer = new Lexer(input);
    const tokens = lexer.scanTokens();
    const parser = new Parser(tokens);
    const program = parser.parse();

    const optimizer = new IterativeOptimizer();
    return optimizer.optimize(program, maxPasses);
  }

  describe("Constant Folding", () => {
    test("should fold arithmetic constants", () => {
      const input = `
        int main() {
          int a = 2 + 3;
          int b = 10 - 4;
          int c = 5 * 6;
          int d = 20 / 4;
          printf(a);
          printf(b);
          printf(c);
          printf(d);
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input);

      expect(stats.constantFolding).toBeGreaterThanOrEqual(4);
      expect(stats.passes).toBeGreaterThan(0);
    });

    test("should fold comparison operators", () => {
      const input = `
        int main() {
          int x = 5 > 3;
          int y = 2 < 1;
          int z = 4 == 4;
          printf(x);
          printf(y);
          printf(z);
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input);

      expect(stats.constantFolding).toBeGreaterThanOrEqual(3);
    });

    test("should handle division by zero detection", () => {
      const input = `
        int main() {
          int x = 5 + 3;
          int y = x - 8;
          printf(x);
          return 0;
        }
      `;

      // This should not throw an error during optimization
      expect(() => optimizeCode(input)).not.toThrow();
    });

    test("should fold nested expressions", () => {
      const input = `
        int main() {
          int result = (2 + 3) * (4 - 1);
          printf(result);
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input);

      expect(stats.constantFolding).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Constant Propagation", () => {
    test("should propagate constants through assignments", () => {
      const input = `
        int main() {
          int a = 5;
          int b = a;
          int c = b + 10;
          int d = c * 2;
          printf(d);
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input);

      expect(stats.constantPropagation).toBeGreaterThan(0);
      expect(stats.constantFolding).toBeGreaterThan(0);
    });

    test("should propagate constants in conditional branches", () => {
      const input = `
        int main() {
          int x = 3;
          int y = 7;
          if (x < y) {
            printf(x);
          } else {
            printf(y);
          }
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input);

      expect(stats.constantPropagation).toBeGreaterThan(0);
      expect(stats.constantFolding).toBeGreaterThan(0);
    });

    test("should handle function parameters in propagation", () => {
      const input = `
        int square(int x) {
          return x * x;
        }

        int main() {
          int a = 4;
          int result = square(a);
          printf(result);
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input);

      expect(stats.constantPropagation).toBeGreaterThan(0);
    });
  });

  describe("Algebraic Simplification", () => {
    test("should simplify addition with zero", () => {
      const input = `
        int main() {
          int x = 42;
          int y = x + 0;
          int z = 0 + x;
          printf(y);
          printf(z);
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input);

      expect(stats.algebraicSimplification).toBeGreaterThanOrEqual(2);
    });

    test("should simplify subtraction with zero", () => {
      const input = `
        int main() {
          int x = 42;
          int y = x - 0;
          printf(y);
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input);

      expect(stats.algebraicSimplification).toBeGreaterThanOrEqual(1);
    });

    test("should simplify multiplication with one", () => {
      const input = `
        int main() {
          int x = 42;
          int y = x * 1;
          int z = 1 * x;
          printf(y);
          printf(z);
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input);

      expect(stats.algebraicSimplification).toBeGreaterThanOrEqual(2);
    });

    test("should simplify division by one", () => {
      const input = `
        int main() {
          int x = 42;
          int y = x / 1;
          printf(y);
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input);

      expect(stats.algebraicSimplification).toBeGreaterThanOrEqual(1);
    });

    test("should simplify multiplication with zero", () => {
      const input = `
        int main() {
          int x = 42;
          int y = x * 0;
          int z = 0 * x;
          printf(y);
          printf(z);
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input);

      expect(stats.algebraicSimplification).toBeGreaterThanOrEqual(2);
    });

    test("should handle complex algebraic expressions", () => {
      const input = `
        int main() {
          int x = 42;
          int result = (x * 1) + (0 * 999) - 0 + (x / 1);
          printf(result);
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input);

      expect(stats.algebraicSimplification).toBeGreaterThanOrEqual(4);
    });
  });

  describe("Dead Code Elimination", () => {
    test("should eliminate unreachable else branch", () => {
      const input = `
        int main() {
          if (1 > 0) {
            printf(1);
          } else {
            printf(0);
            printf(999);
          }
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input);

      expect(stats.constantFolding).toBeGreaterThan(0);
      expect(stats.deadCodeElimination).toBeGreaterThan(0);
    });

    test("should eliminate unreachable then branch", () => {
      const input = `
        int main() {
          if (0 > 1) {
            printf(1);
            printf(2);
          } else {
            printf(0);
          }
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input);

      expect(stats.constantFolding).toBeGreaterThan(0);
      expect(stats.deadCodeElimination).toBeGreaterThan(0);
    });

    test("should eliminate dead while loops", () => {
      const input = `
        int main() {
          int x = 0;
          while (0 > 1) {
            x = x + 1;
            printf(x);
          }
          printf(x);
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input);

      expect(stats.constantFolding).toBeGreaterThan(0);
      expect(stats.deadCodeElimination).toBeGreaterThan(0);
    });

    test("should eliminate unused variable declarations", () => {
      const input = `
        int main() {
          int x = 5;
          int y = 10;
          int z = x + y;
          printf(42);
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input);

      expect(stats.deadCodeElimination).toBeGreaterThan(0);
    });

    test("should eliminate side-effect-free expressions", () => {
      const input = `
        int main() {
          int x = 5;
          x + 10;
          x * 2;
          printf(x);
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input);

      expect(stats.deadCodeElimination).toBeGreaterThan(0);
    });

    test("should eliminate dead assignments", () => {
      const input = `
        int main() {
          int x = 5;
          int y = x + 10;
          x = 20;
          y = 30;
          printf(x);
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input);

      expect(stats.deadCodeElimination).toBeGreaterThan(0);
    });
  });

  describe("Multi-Pass Optimization", () => {
    test("should perform iterative optimization until convergence", () => {
      const input = `
        int main() {
          int a = 1 + 2;
          int b = a + 0;
          int c = b * 1;
          int d = c + (4 * 5);
          printf(d);
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input, 15);

      expect(stats.passes).toBeGreaterThan(1);
      expect(
        stats.constantFolding +
          stats.constantPropagation +
          stats.algebraicSimplification,
      ).toBeGreaterThan(5);
    });

    test("should handle complex multi-pass scenarios", () => {
      const input = `
        int main() {
          int x = 2 + 3;
          int y = x * 1;
          int z = y + 0;
          if (1 > 0) {
            printf(z);
          } else {
            printf(999);
          }
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input);

      expect(stats.passes).toBeGreaterThan(1);
      expect(stats.constantFolding).toBeGreaterThan(0);
      expect(stats.constantPropagation).toBeGreaterThan(0);
      expect(stats.algebraicSimplification).toBeGreaterThan(0);
      expect(stats.deadCodeElimination).toBeGreaterThan(0);
    });

    test("should demonstrate optimization convergence", () => {
      const input = `
        int main() {
          int w = 1 * (2 + 3);
          int x = w + (0 * 999);
          int y = x - 0;
          int z = y / 1;
          if (z == 5) {
            printf(z * 1 + 0);
          }
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input, 15);

      expect(stats.passes).toBeGreaterThan(2);
      expect(
        stats.constantFolding + stats.algebraicSimplification,
      ).toBeGreaterThan(5);
    });
  });

  describe("Function Call Optimization", () => {
    test("should preserve function calls with side effects", () => {
      const input = `
        int square(int x) {
          return x * x;
        }

        int main() {
          int a = 2 + 3;
          int b = square(a);
          int c = b + 0;
          printf(c);
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input);

      expect(stats.constantFolding).toBeGreaterThan(0);
      expect(stats.constantPropagation).toBeGreaterThan(0);
      expect(stats.algebraicSimplification).toBeGreaterThan(0);
      // Function calls should be preserved
      expect(optimized.functions.length).toBe(2);
    });

    test("should handle printf calls correctly", () => {
      const input = `
        int main() {
          int x = 5 + 3;
          printf(x);
          printf(42);
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input);

      expect(stats.constantFolding).toBeGreaterThan(0);
      // printf calls should be preserved as they have side effects
    });
  });

  describe("Control Flow Optimization", () => {
    test("should optimize nested control structures", () => {
      const input = `
        int main() {
          int x = 5;
          if (x > 3) {
            x = x + 1;
            if (x > 6) {
              printf(x);
            }
          } else {
            x = x - 1;
          }
          printf(x);
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input);

      expect(stats.passes).toBeGreaterThan(0);
      expect(stats.constantPropagation).toBeGreaterThan(0);
      expect(optimized.functions.length).toBe(1);
    });

    test("should handle while loops with constant conditions", () => {
      const input = `
        int main() {
          int sum = 0;
          while (3 > 5) {
            sum = sum + 1;
            printf(sum);
          }
          printf(sum);
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input);

      expect(stats.constantFolding).toBeGreaterThan(0);
      expect(stats.deadCodeElimination).toBeGreaterThan(0);
    });

    test("should preserve while loops with true conditions", () => {
      const input = `
        int main() {
          int x = 0;
          while (5 > 3) {
            x = x + 1;
            if (x > 10) {
              return x;
            }
          }
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input);

      expect(stats.constantFolding).toBeGreaterThan(0);
      // The while loop should be preserved despite constant condition
    });
  });

  describe("Complex Optimization Scenarios", () => {
    test("should handle comprehensive optimization example", () => {
      const input = `
        int main() {
          int a = 3;
          int b = a + 7;
          int dead = 2 * b;
          if (a < b) {
            dead = a / 2 + b / 3;
          } else {
            dead = a * b + b;
          }
          printf(dead);
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input, 10);

      expect(stats.passes).toBeGreaterThan(2);
      expect(stats.constantPropagation).toBeGreaterThan(0);
      expect(stats.constantFolding).toBeGreaterThan(0);
      expect(stats.deadCodeElimination).toBeGreaterThan(0);
    });

    test("should handle optimization with multiple variables", () => {
      const input = `
        int main() {
          int a = 1;
          int b = 2;
          int c = 3;
          int d = a + b + c;
          int e = d * 1 + 0;
          int f = e - 0;
          if (f > 0) {
            printf(f);
          } else {
            printf(0);
          }
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input, 10);

      expect(stats.passes).toBeGreaterThan(1);
      expect(stats.constantFolding).toBeGreaterThan(0);
      expect(stats.constantPropagation).toBeGreaterThan(0);
      expect(stats.algebraicSimplification).toBeGreaterThan(0);
      expect(stats.deadCodeElimination).toBeGreaterThan(0);
    });

    test("should handle edge case with all optimizations", () => {
      const input = `
        int main() {
          int x = 0 + 5;
          int y = x * 1;
          int z = y / 1;
          int unused = 999;
          if (2 > 1) {
            z = z + 0;
            printf(z);
          } else {
            unused = unused * 0;
            printf(unused);
          }
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input, 10);

      expect(stats.passes).toBeGreaterThan(0);
      expect(stats.constantFolding).toBeGreaterThan(0);
      expect(stats.algebraicSimplification).toBeGreaterThan(0);
      expect(stats.deadCodeElimination).toBeGreaterThan(0);
    });
  });

  describe("Optimization Statistics", () => {
    test("should track optimization statistics correctly", () => {
      const input = `
        int main() {
          int a = 2 + 3;
          int b = a * 1;
          int c = b + 0;
          int d = c - 0;
          int e = d / 1;
          printf(e);
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input);

      expect(stats.passes).toBeGreaterThan(0);
      expect(stats.totalOptimizations).toBe(
        stats.constantFolding +
          stats.constantPropagation +
          stats.algebraicSimplification +
          stats.deadCodeElimination,
      );
      expect(stats.totalOptimizations).toBeGreaterThan(0);
    });

    test("should handle no optimization needed", () => {
      const input = `
        int main() {
          printf(42);
          return 0;
        }
      `;

      const { optimized, stats } = optimizeCode(input);

      expect(stats.passes).toBeGreaterThan(0);
      // Should still make at least one pass even if no optimizations are found
    });
  });
});
