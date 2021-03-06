import { formatDistanceToNow, format, differenceInCalendarDays, endOfDay } from 'date-fns'
import { Project } from "./project";
import { Tag } from "./tag";
import {
	updateLocalStorage,
	getItemFromLocal,
	deleteLocalStorage
} from "./storage";
import { Task } from "./task";
import { Checklist } from "./checklist";

//DATABASE OF THE TODO APP
const TODO_DATA = {
	active: {
		projectId: '',
		tagIds: [],
	},
	filter: {
		task: 'all',
		folder: 'scheduled'
	},
	projects: getItemFromLocal('projects') || [],
	tags: getItemFromLocal('tags') || [],
}



//TODO MODULE PATTERN
const Todo = (() => {
	const _data = TODO_DATA;
	const addProject = (prjName) => {
		_data.projects.push(new Project(prjName));
		updateLocalStorage('projects', _data.projects);
	}

	const addTag = (tagName) => {
		_data.tags.push(new Tag(tagName));
		updateLocalStorage('tags', _data.tags);
	}

	const alphabetRegex = (str) => /^[a-zA-Z](.|\s)*$/.test(str);

	const deleteData = () => {
		_data.projects = [];
		_data.tags = [];
		deleteLocalStorage('projects');
		deleteLocalStorage('tags');
	}

	const deleteProject = (id) => {
		const index = findIndexOfObj(_data.projects, 'id', id);
		_data.projects.splice(index, 1);
		updateLocalStorage('projects', _data.projects);
	}

	const deleteTag = (id) => {
		const index = findIndexOfObj(_data.tags, 'id', id);
		_data.tags.splice(index, 1);
		updateLocalStorage('tags', _data.tags);
	}

	const deleteTask = (taskId, selectedFolder) => {
		const prjId = getPrjIdByActiveFolder(selectedFolder, taskId);
		const prjIndex = getFilteredPrjIndex(prjId);
		const taskIndex = getFilteredTaskIndex(prjId, taskId);
		_data.projects[prjIndex].tasks.splice(taskIndex, 1);
		updateLocalStorage('projects', _data.projects);
	}

	const findIndexOfObj = (arr, prop, val) => arr.findIndex(v => v[prop] === val);

	const getAllTasks = () => {
		const projects = getFilteredProjects();
		return projects.reduce((tasks, prj) => tasks.concat(prj.tasks), []);
	}

	const getFilteredProjects = (filterName) => {
		const projects = [..._data.projects];
		if (!filterName) return projects;
		if (filterName.includes('__az')) {
			return _sortByAscending(projects);
		} else if (filterName.includes('__size')) {
			return _sortPrjsBySize(projects);
		} else if (filterName.includes('__inactive')) {
			return _sortPrjsByInactivity(projects);
		} else {
			return projects;
		}
	}

	const getFilteredTags = (filterName) => {
		const tags = [..._data.tags];
		if (!filterName) return tags;
		if (filterName.includes('__az')) {
			return _sortByAscending(tags);
		} else if (filterName.includes('__size')) {
			return _sortTagsBySize(tags);
		} else if (filterName.includes('__inactive')) {
			return _sortTagsByInactivity(tags);
		} else {
			return tags;
		}
	}

	const getTasksByTags = () => {
		const tasks = getAllTasks();
		const activeTags = getTagIds();
		return tasks.filter(task => {
			const tagIds = task.tags.map(task => task.id);
			return activeTags.every(tag => tagIds.includes(tag));
		}) || [];
	}

	const getFilteredTasks = () => {
		const filterName = _data.filter.task;
		const isAddTaskHidden = document.querySelector('.add-task-btn').classList.contains('hide');
		const tasks = !isAddTaskHidden ? getTasks() :
			getTagIds().length ? getTasksByTags() : getAllTasks();

		if (!filterName) return tasks;
		if (filterName === 'active') {
			return tasks.filter(task => !task.completed);
		} else if (filterName === 'all') {
			return tasks;
		} else {
			return sortByRemainingDays(filterName, tasks);
		}
	}

	//convert yyyyMMdd to a number of year, month and day
	const formatDateForConversion = (date) => {
		const taskDate = date.toString();
		const splitDateByHyphen = taskDate.split('-');
		const dueYear = Number(splitDateByHyphen[0]);
		const dueMonth = Number(splitDateByHyphen[1]);
		const dueDay = Number(splitDateByHyphen[2]);

		return {
			year: dueYear,
			month: dueMonth - 1,
			day: dueDay + 1
		}
	}

	const formatDateByToNow = (date) => {
		const { year, month, day } = formatDateForConversion(date);
		return formatDistanceToNow(new Date(year, month, day), { addSuffix: true });
	}

	const getDifferenceInDays = (dueDate) => {
		const today = format(new Date(), 'yyyy-MM-dd');
		const todayObj = formatDateForConversion(today);
		const dueDateObj = formatDateForConversion(dueDate);
		const todayDays = endOfDay(new Date(todayObj.year, todayObj.month, todayObj.day));
		const dueDateDays = endOfDay(new Date(dueDateObj.year, dueDateObj.month, dueDateObj.day));
		return differenceInCalendarDays(dueDateDays, todayDays);
	}

	const sortByRemainingDays = (filterName, tasks) => {
		const days = {
			today: {
				min: 0,
				max: 0
			},
			week: {
				min: 1,
				max: 7
			},
			month: {
				min: 8,
				max: 31
			},
			later: {
				min: 32,
				max: Infinity
			}
		}
		const compareDays = (task) => {
			return getDifferenceInDays(task.dueDate) >= days[filterName].min
				&& getDifferenceInDays(task.dueDate) <= days[filterName].max;
		};
		return tasks.filter(compareDays);
	}

	const getTasks = () => {
		const project = _data.projects;
		const projectId = _data.active.projectId;
		const prjIndex = findIndexOfObj(_data.projects, 'id', projectId);
		return project[prjIndex].tasks;
	}

	const totalTasksOfTag = (tagId) => {
		const tasks = getAllTasks();
		return tasks.filter(task => {
			return !!task.tags.find(taskTag => tagId === taskTag.id);
		}).length;
	}

	const _sortByAscending = (arr) => {
		return arr.sort((a, b) => {
			return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
		});
	}

	const _sortPrjsBySize = () => {
		return [..._data.projects].sort((a, b) => {
			return a.tasks.length < b.tasks.length ? 1 : -1;
		});
	}

	const _sortPrjsByInactivity = (projects) => {
		return projects.filter(prj => {
			return prj.tasks.length && prj.tasks.every(task => task.completed);
		});
	}

	const _sortTagsBySize = (tags) => {
		return tags.sort((a, b) => {
			return totalTasksOfTag(a.id) < totalTasksOfTag(b.id) ? 1 : -1;
		});
	}

	const _sortTagsByInactivity = (tags) => {
		const tasks = getAllTasks();
		return tags.filter(tag => {
			const tasksLinkedToTag = tasks.filter(task => {
				return task.tags.some(taskTag => taskTag.id === tag.id);
			});
			return tasksLinkedToTag.every(task => task.completed);
		});
	}

	const setProjectNameById = (e, id) => {
		const newName = e.target.value;
		const index = findIndexOfObj(_data.projects, 'id', id);
		_data.projects[index].name = newName;
		updateLocalStorage('projects', _data.projects);
	}

	const setTask = (id, props) => {
		const { title, desc, checklist, dueDate, tags } = props;
		const newChecklist = setChecklist(checklist);
		const prjIndex = findIndexOfObj(_data.projects, 'id', id);
		const currentProject = _data.projects[prjIndex];
		const newTask = new Task(title, desc, newChecklist, dueDate, tags);
		currentProject.tasks.push(newTask);
		updateLocalStorage('projects', _data.projects);
	}

	const setChecklist = (checklist) => {
		return checklist.reduce((arr, obj) => {
			const checklistItem = new Checklist(obj.desc, obj.completed);
			arr.push(checklistItem);
			return arr;
		}, [])
	}

	const editTask = (taskId, props, selectedFolder) => {
		const { title, desc, checklist, dueDate, tags } = props;
		const prjId = getPrjIdByActiveFolder(selectedFolder, taskId);
		const { prjIndex, taskIndex } = getFilteredPrjAndTaskIndexes({ prjId, taskId });

		//update the task with the new received inputs
		_data.projects[prjIndex].tasks[taskIndex].title = title;
		_data.projects[prjIndex].tasks[taskIndex].desc = desc;
		_data.projects[prjIndex].tasks[taskIndex].dueDate = dueDate;
		_data.projects[prjIndex].tasks[taskIndex].tags = tags;

		modifyTaskChecklist(checklist, prjIndex, taskIndex);
		updateLocalStorage('projects', _data.projects);
	}

	const modifyTaskChecklist = (checklist, prjIndex, taskIndex) => {
		//edited checklist modified by the user
		const cList = _data.projects[prjIndex].tasks[taskIndex].checklist;

		//modify the properties of the existing task checklist
		//otherwise push a new checklist obj
		checklist.map((c, i) => {
			if (cList[i]) {
				cList[i].desc = c.desc;
				cList[i].completed = c.completed;
			} else {
				cList.push(new Checklist(c.desc, c.completed));
			}
		})
		cList.splice(checklist.length, cList.length - checklist.length);
	}

	const toggleTaskCompletion = (toggleBox, taskId, selectedFolder) => {
		const prjId = getPrjIdByActiveFolder(selectedFolder, taskId);
		const prjIndex = getFilteredPrjIndex(prjId);
		const taskIndex = getFilteredTaskIndex(prjId, taskId);
		_data.projects[prjIndex].tasks[taskIndex].completed = toggleBox;
		updateLocalStorage('projects', _data.projects);
	}

	const toggleChecklistCompletion = (toggleBox, ids, selectedFolder) => {
		const prjId = getPrjIdByActiveFolder(selectedFolder, ids.taskId);
		const prjIndex = getFilteredPrjIndex(prjId);
		const taskIndex = getFilteredTaskIndex(prjId, ids.taskId);
		const idsIncludingPrjId = Object.assign(ids, { projectId: prjId });
		const checklistIndex = getFilteredChecklistIndex(idsIncludingPrjId);

		//toggle checkbox
		_data.projects[prjIndex]
			.tasks[taskIndex]
			.checklist[checklistIndex]
			.completed = toggleBox;

		updateLocalStorage('projects', _data.projects);
	}

	const getPrjIdByActiveFolder = (selectedPrj, taskId) => {
		return selectedPrj === 'prj' ? getProjectId() : getProjectIdOfTask(taskId);
	}

	const getFilteredPrjIndex = (prjId) => {
		return findIndexOfObj(_data.projects, 'id', prjId);
	}

	const getFilteredTaskIndex = (prjId, taskId) => {
		const prjIndex = getFilteredPrjIndex(prjId);
		return findIndexOfObj(_data.projects[prjIndex].tasks, 'id', taskId);
	}

	const getFilteredChecklistIndex = ({ projectId, taskId, checklistId }) => {
		const prjIndex = getFilteredPrjIndex(projectId);
		const tskIndex = getFilteredTaskIndex(projectId, taskId);
		const checklistPath = _data.projects[prjIndex].tasks[tskIndex].checklist;
		return findIndexOfObj(checklistPath, 'id', checklistId);
	}

	const getFilteredPrjAndTaskIndexes = (ids) => {
		const { prjId, taskId } = ids;
		return {
			prjIndex: getFilteredPrjIndex(prjId),
			taskIndex: getFilteredTaskIndex(prjId, taskId)
		}
	}

	const getProjectIdOfTask = (taskId) => {
		const projects = [..._data.projects].filter(prj => {
			return prj.tasks.find(task => task.id === taskId);
		});
		return projects[0].id;
	}


	const isProjectActive = (id) => {
		return _data.active.projectId == id;
	}

	const isTagActive = (id) => {
		return _data.active.tagIds.find(v => v == id);
	}

	const getTags = () => _data.tags;

	const getFolderFilter = () => _data.filter.folder;

	const getProjectId = () => _data.active.projectId;

	const setProjectId = (id) => _data.active.projectId = id;

	const pushActiveTags = (id) => _data.active.tagIds.push(id);

	const deselectTag = (id) => {
		const tagIds = _data.active.tagIds;
		const index = tagIds.indexOf(id);
		if (index > -1) {
			tagIds.splice(index, 1);
		}
	};

	const getTagIds = () => _data.active.tagIds;

	const setFolderFilter = (id) => _data.filter.folder = id;

	const setTaskFilter = (id) => _data.filter.task = id;

	return {
		addProject,
		addTag,
		alphabetRegex,
		deleteData,
		deleteProject,
		deleteTag,
		deleteTask,
		deselectTag,
		editTask,
		findIndexOfObj,
		formatDateByToNow,
		getAllTasks,
		getFilteredProjects,
		getFilteredTags,
		getFilteredTasks,
		getFolderFilter,
		getProjectId,
		getProjectIdOfTask,
		getTagIds,
		getTags,
		getTasks,
		getTasksByTags,
		isProjectActive,
		isTagActive,
		pushActiveTags,
		setFolderFilter,
		setProjectId,
		setProjectNameById,
		setTask,
		setTaskFilter,
		toggleTaskCompletion,
		toggleChecklistCompletion,
		totalTasksOfTag
	};
})();

export default Todo;