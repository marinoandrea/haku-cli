import {IncomingHttpHeaders} from 'http';
import {ParsedUrlQuery} from 'querystring';

export interface HttpRequest {
  method: string;
  resource: string;
  body: unknown;
  params: {[key: string]: string};
  headers: IncomingHttpHeaders;
  query: ParsedUrlQuery;
}

export interface HttpResponse<SuccessBody, ErrorBody> {
  body: SuccessBody | ErrorBody;
  headers?: any;
  status: number;
  contentType: string;
  contentDisposition: 'inline' | 'attachment';
  raw: boolean;
}
