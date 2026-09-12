import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { PermissionsGuard } from 'src/common/permission/permission.guard';
import { Permissions } from 'src/common/permission/permission.decorator';
import {
  ResponseMessage,
  ResponseResultCode,
} from 'src/common/response/response.decorator';
import { ResponseInterceptor } from 'src/common/response/response.interceptor';
import {
  CreateWorkOrderTaskDto,
  ApproveAdditionalProblemDto,
  getWorkOrderTasksWithPaginationDto,
  ReportAdditionalProblemDto,
  RejectAdditionalProblemDto,
  UpdateTaskStatusDto,
  UpdateWorkOrderTaskDto,
} from './dtos/task.dto';
import { TaskService } from './task.service';
import type { Request } from 'express';
import { ParseSortPipe } from 'src/common/pipes/parse-sort.pipe';
import type { SortCriterial } from 'src/common/pipes/parse-sort.pipe';

@Controller('task')
export class TaskController {
  constructor(private taskService: TaskService) {}
  // POST   /tasks
  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('create:tasks')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Create work order successful')
  async createWorkOrder(
    @Body() dto: CreateWorkOrderTaskDto,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.taskService.createTask(dto, authUser);
  }

  // GET    /tasks
  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions('view:tasks')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('get list work order successful')
  async getListWorkOrder(
    @Query() query: getWorkOrderTasksWithPaginationDto,
    @Query('sort', ParseSortPipe) sortBy: SortCriterial,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.taskService.getTasksWithPagination(query, sortBy);
  }

  // GET    /tasks/:taskNo
  @Get('/:taskNo')
  @UseGuards(PermissionsGuard)
  @Permissions('view:tasks')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Get task successful')
  async getWorkOrderByNo(
    @Req() { authUser }: Request,
    @Param('taskNo') taskNo: string,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.taskService.getTaskByNo(taskNo);
  }

  // PATCH  /tasks/:taskNo/status   <-- เปลี่ยนสถานะ
  @Patch('/:taskNo/status')
  @UseGuards(PermissionsGuard)
  @Permissions('update:task')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Update status task successful')
  async updateTaskStatus(
    @Body() dto: UpdateTaskStatusDto,
    @Req() { authUser }: Request,
    @Param('taskNo') taskNo: string,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.taskService.updateStatus(taskNo, dto.status, authUser);
  }

  @Post('/:taskNo/additional-problem')
  @UseGuards(PermissionsGuard)
  @Permissions('update:task')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Report additional problem successful')
  async reportAdditionalProblem(
    @Param('taskNo') taskNo: string,
    @Body() dto: ReportAdditionalProblemDto,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.taskService.reportAdditionalProblem(taskNo, dto, authUser);
  }

  @Post('/:taskNo/additional-problem/:problemId/approve')
  @UseGuards(PermissionsGuard)
  @Permissions('update:task')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Approve additional problem successful')
  async approveAdditionalProblem(
    @Param('taskNo') taskNo: string,
    @Param('problemId') problemId: string,
    @Body() dto: ApproveAdditionalProblemDto,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.taskService.approveAdditionalProblem(
      taskNo,
      problemId,
      dto,
      authUser,
    );
  }

  @Post('/:taskNo/additional-problem/:problemId/reject')
  @UseGuards(PermissionsGuard)
  @Permissions('update:task')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Reject additional problem successful')
  async rejectAdditionalProblem(
    @Param('taskNo') taskNo: string,
    @Param('problemId') problemId: string,
    @Body() dto: RejectAdditionalProblemDto,
    @Req() { authUser }: Request,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.taskService.rejectAdditionalProblem(
      taskNo,
      problemId,
      dto,
      authUser,
    );
  }

  // PATCH  /tasks/:taskNo          <-- แก้ข้อมูลทั้งหมด
  @Patch('/:taskNo/')
  @UseGuards(PermissionsGuard)
  @Permissions('update:task')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Update task successful')
  async updateTask(
    @Body() dto: UpdateWorkOrderTaskDto,
    @Req() { authUser }: Request,
    @Param('taskNo') taskNo: string,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.taskService.updateTask(taskNo, dto, authUser);
  }

  // DELETE /tasks/:taskNo
  @Post('/:taskNo/delete')
  @UseGuards(PermissionsGuard)
  @Permissions('delete:task')
  @UseInterceptors(ResponseInterceptor)
  @ResponseResultCode('2000')
  @ResponseMessage('Delete task successful')
  async deleteTask(
    @Req() { authUser }: Request,
    @Param('taskNo') taskNo: string,
  ) {
    if (!authUser) {
      throw new BusinessException('4013', 'No auth user found');
    }

    return this.taskService.deleteTask(taskNo, authUser);
  }
}
