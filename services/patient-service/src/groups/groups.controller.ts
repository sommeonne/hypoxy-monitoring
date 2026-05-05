import {
  Controller, Get, Post, Delete,
  Body, Param, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { Group } from './group.entity';

@ApiTags('groups')
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @ApiOperation({ summary: 'List all groups' })
  findAll(): Promise<Group[]> {
    return this.groupsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a group' })
  create(@Body('number') number: number): Promise<Group> {
    return this.groupsService.create(number);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a group' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.groupsService.remove(id);
  }
}
