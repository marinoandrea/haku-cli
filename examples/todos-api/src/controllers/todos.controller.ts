import { HttpRequest, HttpResponse } from "./interfaces";

export class TodosController {
    static getTodos(req: HttpRequest): Promise<HttpResponse> {
        let validatedBody = validateGetTodosBody(req.body);
    }

    static postTodos(req: HttpRequest): Promise<HttpResponse> {
        let validatedBody = validatePostTodosBody(req.body);
    }

    static putTodosById(req: HttpRequest): Promise<HttpResponse> {
        let validatedBody = validatePutTodosByIdBody(req.body);
    }

    static deleteTodosById(req: HttpRequest): Promise<HttpResponse> {
        let validatedBody = validateDeleteTodosByIdBody(req.body);
    }
}