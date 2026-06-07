export const getCookieValue = (cookieHeader: string | undefined, name: string): string | undefined => {
  const rawValue = cookieHeader
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);

  return rawValue ? decodeURIComponent(rawValue) : undefined;
};
