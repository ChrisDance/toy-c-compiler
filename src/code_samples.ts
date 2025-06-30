export type CodeSample = { code: string; output: number };

export const code_samples: CodeSample[] = [
  // Test 1: Function calls with nested expressions and control flow
  {
    code: `int Square(int arg) {
    return arg * arg;
  }

  int main() {
    int i = 5;
    int k = 4;
    int j = k + i;
    if (i > j) {
      printf(Square(Square(2)));
    } else {
      printf(5);
    }
    return 0;
  }`,
    output: 5,
  },
];

// ,
//   // Test 2: While loops (FIXED - added parameter)
//   `int testWhile(int k) {
//     while (k > 0) {
//       k = k - 1;
//     }
//   }

//   int main() {
//     testWhile(5);
//     printf(10);
//     return 0;
//   }`,

//   // Test 3: Algebraic simplification and dead function elimination
//   `int redundant() {
//     return 5;
//   }

//   int main() {
//     int w = 1 * (2 + 3);
//     int x = w + (0 * 999);
//     int y = x - 0;
//     int z = y / 1;
//     if (z == 5) {
//       printf(z * 1 + 0);
//     }
//     return 0;
//   }`,

//   // Test 4: Constant propagation through control flow (FIXED - added printf)
//   `int main() {
//     int x = 3;
//     int y = x + 7;
//     int z = 2 * y;
//     if (x > y) {
//       z = x / 2 + y / 3;
//     } else {
//       z = x * y + y;
//     }
//     printf(z);
//     return 0;
//   }`,

//   // Test 5: While loops with assignment statements
//   `int main() {
//     int count = 0;
//     int limit = 3;
//     while (count < limit) {
//       count = count + 1;
//       printf(count);
//     }
//     return 0;
//   }`,

//   // Test 6: Unreachable code elimination
//   `int main() {
//     if (5 > 10) {
//       printf(999);
//     }
//     if (0 == 0) {
//       printf(42);
//     }
//     return 0;
//   }`,

//   // Test 7: Complex expression optimization
//   `int main() {
//     int a = (3 + 2) * (1 + 0);
//     int b = a / 1 + 0 * 999;
//     printf(b);
//     return 0;
//   }`,

//   // Test 8: Assignment statements with optimization
//   `int main() {
//     int x = 10;
//     x = x + 5;
//     x = 0 + x;
//     printf(x);
//     return 0;
//   }`,

//   // Test 9: Constant condition folding
//   `int main() {
//     int result = 0;
//     if (1 == 1) {
//       result = 100;
//     } else {
//       result = 200;
//     }
//     printf(result);
//     return 0;
//   }`,

//   // Test 10: Dead variable elimination
//   `int main() {
//     int unused1 = 42;
//     int unused2 = unused1 * 2;
//     int used = 10;
//     printf(used);
//     return 0;
//   }`,

//   // Test 11: Nested function calls with optimization
//   `int Double(int x) {
//     return x * 2;
//   }

//   int Add(int a) {
//     return a + 0;
//   }

//   int main() {
//     int value = 5;
//     int result = Double(Add(value));
//     printf(result);
//     return 0;
//   }`,

//   // Test 12: Multiple optimization opportunities
//   `int main() {
//     int a = 2 + 3;
//     int b = a * 1;
//     int c = b + 0;
//     int d = c / 1;
//     int e = d - 0;
//     if (e > 0) {
//       printf(1 * e + 0 * 999);
//     }
//     return 0;
//   }`,

//   // Test 13: Loop with constant condition (should be eliminated)
//   `int main() {
//     int sum = 0;
//     while (0 > 1) {
//       sum = sum + 1;
//       printf(sum);
//     }
//     printf(sum);
//     return 0;
//   }`,

//   // Test 14: Comparison operators testing
//   `int main() {
//     int x = 10;
//     int y = 5;
//     if (x > y) {
//       printf(1);
//     }
//     if (x < y) {
//       printf(2);
//     }
//     if (x == y) {
//       printf(3);
//     }
//     return 0;
//   }`,

//   // Test 15: Function with optimization potential
//   `int Calculate(int input) {
//     int temp = input + 0;
//     int result = temp * 1;
//     return result / 1;
//   }

//   int main() {
//     printf(Calculate(42));
//     return 0;
//   }`,
// ];
