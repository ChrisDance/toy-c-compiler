export type CodeSample = { code: string; output: number };
export const code_samples: CodeSample[] = [];

export const working = [
  {
    code: `

 int main()
 {
  int i = 7;
  int k = &i;
  printf(*k);
  return 0;
 }


 `,
    output: 7,
  },

  {
    code: `
    void printNumber() {
         printf(42);
         return;
       }

       int main() {
         printNumber();
         return 0;
       }
    `,
    output: 42,
  },
  {
    code: `int main() {
    int result = 5;
    if (1 == 1) {
      result = 100;
    } else {
      result = 200;
    }
    printf(result);
    return 0;
  }`,
    output: 100,
  },
  {
    code: `int main() {
    int count = 10;
    int limit = 0;
    while (count > limit) {
      count = count - 1;
    }
    printf(0);
    return 0;
  }`,
    output: 0, // Last printf outputs 3 (after count becomes 3, loop exits)
  },
  {
    code: `int main() {
    int a = (3 + 2) * (1 + 0);
    int b = a / 1 + 0 * 999;
    printf(b);
    return 0;
  }`,
    output: 5, // a = 5 * 1 = 5, b = 5 / 1 + 0 = 5
  },
  // Test 5: While loops with assignment statements
  // code_samples[0],
  //
  // Test exit
  {
    code: `int main() {
  int a = 2 + 3;
  int b = a * 1;
  int c = b + 0;
  int d = c / 1;
  int e = d - 0;
  if (e > 0) {
    printf(1 * e + 0 * 999);
  }
  return 0;
}`,
    output: 5, // All operations simplify to 5
  },
  {
    code: `
      int main()
      {
        exit(0);
        printf(2);
        return 0;
      }

   `,
    output: "",
  },
  // Test for multiple args
  {
    code: `

    int func(int a, int b) {
       return a + b;
    }

    int main() {

    printf(func(5, 5)) ;
    return 0;
    }

    `,
    output: 10,
  },
  // Test case for recursion:
  {
    code: `int recurse(int n) {
              if(n > 5)
              {
                 return n;
              }

              return recurse(n + 1);

        }
      int main() {
          printf(recurse(1));
          return 0;
      }`,
    output: 6,
  },
  // Test 1: Function calls with nested expressions and control flow
  //
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
  //Test 2: While loops (FIXED - added parameter)
  {
    code: `
    int testWhile(int k) {
    while (k > 3) {
      k = k - 1;
    }
    return k;
  }
  int main() {
    printf(testWhile(5));
    return 0;
  }`,
    output: 3,
  },
  // Test 3: Algebraic simplification and dead function elimination
  {
    code: `int redundant() {
    return 5;
  }
  int main() {
    int w = 1 * 5;
    int x = w;
    int y = x - 0;
    int z = y / 1;
    if (z == 5) {
      printf(z * 1 + 0);
    }
    return 0;
  }`,
    output: 5,
  },
  //Test 4: Constant propagation through control flow (FIXED - added printf)
  {
    code: `int main() {
    int x = 3;
    int y = x + 7;
    int z = 2 * y;
    if (x > y) {
      z = x / 2 + y / 3;
    } else {
      z = x * y + y;
    }
    printf(z);
    return 0;
  }`,
    output: 40, // x=3, y=10, z initially 20, but since x<y, z becomes 3*10+10 = 40
  },

  // Test 6: Unreachable code elimination
  {
    code: `int main() {
    if (5 > 10) {
      printf(999);
    }
    if (0 == 0) {
      printf(42);
    }
    return 0;
  }`,
    output: 42,
  },

  // Test 8: Assignment statements with optimization
  {
    code: `int main() {
    int x = 10;
    x = x + 5;
    x = 0 + x;
    printf(x);
    return 0;
  }`,
    output: 15,
  },

  // Test 10: Dead variable elimination
  {
    code: `int main() {
    int unused1 = 42;
    int unused2 = unused1 * 2;
    int used = 10;
    printf(used);
    return 0;
  }`,
    output: 10,
  },
  // Test 11: Nested function calls with optimization
  {
    code: `int Double(int x) {
    return x * 2;
  }
  int Add(int a) {
    return a + 0;
  }
  int main() {
    int value = 5;
    int result = Double(Add(value));
    printf(result);
    return 0;
  }`,
    output: 10, // Add(5) = 5, Double(5) = 10
  },
  // Test 13: Loop with constant condition (should be eliminated)
  {
    code: `int main() {
    int sum = 0;
    while (0 > 1) {
      sum = sum + 1;
      printf(sum);
    }
    printf(sum);
    return 0;
  }`,
    output: 0, // Loop never executes, sum remains 0
  },
  // Test 14: Comparison operators testing
  {
    code: `int main() {
    int x = 10;
    int y = 5;
    if (x > y) {
      printf(1);
    }
    if (x < y) {
      printf(2);
    }
    if (x == y) {
      printf(3);
    }
    return 0;
  }`,
    output: 1, // Only first condition is true (10 > 5)
  },
  // // Test 15: Function with optimization potential
  {
    code: `int Calculate(int input) {
    int temp = input + 0;
    int result = temp * 1;
    return result / 1;
  }
  int main() {
    printf(Calculate(42));
    return 0;
  }`,
    output: 42, // All operations are identity operations, returns input
  },
  // //Test 16 bigger stack
  {
    code: `


     int a(int i) {return 1 + i;}
     int b(int i) {return 1 + i;}
     int c(int i) {return 1 + i;}
     int d(int i) {return 1 + i;}
     int e(int i) {return 1 + i;}
    int f(int i) {return 1 + i;}

   int main() {
     printf(a(b(c(d(e(f(1)))))));
     return 0;
   }`,
    output: 7, // All operations are identity operations, returns input
  },
];
