enum tag {
    'right' = 'right',
    'left' = 'left',
}

interface ILeft<A> {
    value: A;
    tag: tag.left;
}

interface IRight<B> {
    value: B;
    tag: tag.right;
}

export type Either<A, B> = ILeft<A> | IRight<B>;

export const Left = <A>(val: A): ILeft<A> => ({ value: val, tag: tag.left });
export const Right = <B>(val: B): IRight<B> => ({ value: val, tag: tag.right });

export const isLeft = <A>(val: any): val is ILeft<A> => (val as ILeft<A>).tag === tag.left;
export const isRight = <B>(val: any): val is IRight<B> => (val as IRight<B>).tag === tag.right;


export const logger = (type: 'info' | 'error' | 'debug', ...args: any[]) => console.log(new Date().toISOString(), `[${type}]`, ...args);


export type Optional<T> = T | undefined;
