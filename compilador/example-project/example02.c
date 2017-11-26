#include <stdio.h>
#include <stdlib.h>
#include <limits.h>

unsigned long long fib(int n)
{
	static unsigned long long cache[1024] = {0, 1};
	unsigned long long a;
	unsigned long long b;

	if (n < 0)
		return ULONG_LONG_MAX;
	if (n < 2 || cache[n])
		return cache[n];
	if (sizeof(cache)/sizeof(cache[0]) <= n)
		return ULONG_LONG_MAX;

	a = fib(n - 1);
	b = fib(n - 2);
	if (a + b < a)
		return ULONG_LONG_MAX;
	return cache[n] = a + b;
}

int main()
{
	int i = 0;
	unsigned long long f;
	while (ULONG_LONG_MAX != (f = fib(i++)))
		printf("fib(%3d) = %20llu\n", i, f);
	printf("fib(%3d) = OVERFLOW(@%llu)\n", i, f);
	return 0;
}
