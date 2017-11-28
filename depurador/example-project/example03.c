#include <stdio.h>
#include <stdlib.h>

int main()
{
	char buf[BUFSIZ] = {0};
	scanf("%s", buf);
	printf("hello '%s'\n", buf);
	return 0;
}
