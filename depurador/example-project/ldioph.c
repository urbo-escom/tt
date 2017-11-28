#include <stdio.h>
#include <stdlib.h>

int gcd(int a, int b)
{
	if (a < 0)
		return gcd(-a, b);
	if (b < 0)
		return gcd(a, -b);
	if (0 == a && 0 == b)
		return -1;

	if (0 == b)
		return a;
	return gcd(b, a%b);
}

int main(int argc, char **argv)
{
	int a = 1993;
	int b = 2017;
	int c = 1;
	int x;
	int y;

	if ((1 + 3) <= argc) {
		a = atoi(argv[1]);
		b = atoi(argv[2]);
		c = atoi(argv[3]);
	}

	printf("gcd(%d, %d) = %d\n", a, b, gcd(a, b));

	return EXIT_SUCCESS;
}
