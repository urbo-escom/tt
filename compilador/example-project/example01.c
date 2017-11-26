#include <stdio.h>
#include <stdlib.h>

int fib(int n)
{
	if (n < 2)
		return n;
	return fib(n - 1) + fib(n - 2);
}

int main()
{
	int i;
	for (i = 0; i < 30; i++) {
		int f;
		f = fib(i);
		printf("fib(%d) = %d\n", i, f);
	}
	return 0;
}
