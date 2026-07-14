import { Task } from '@criticalmanufacturing/connect-iot-controller-engine';
import { TestTaskTask } from './test-task.task';

@Task.TaskModule({
  task: TestTaskTask,
})
export class TestTaskModule {}
