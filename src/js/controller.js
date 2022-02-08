import DOMController from './dom-controller';
import Todo from './todo';
import swal from 'sweetalert';

export const addFolderTab = (tabName) => {
    const selectedFolder = DOMController.getSelectedFolder();
    selectedFolder == 'prj' ? Todo.addProject(tabName) : Todo.addTag(tabName);
}

export const deleteDatabase = () => {
    Todo.deleteData();
    removeFolderList();
}

export const displayProjects = (filterName = null) => {
    removeFolderList();
    const projects = Todo.getFilteredProjects(filterName);
    DOMController.renderProjects(projects);
}

export const displayTags = (filterName = null) => {
    removeFolderList();
    const tags = Todo.getFilteredTags(filterName);
    DOMController.renderTags(tags);
}

export const removeFolderList = () => {
    const parentEl = document.querySelector('.folder__list');
    DOMController.removeAllChildNodes(parentEl);
}

export const switchFolder = (e) => {
    DOMController.switchFolder(e);
    updateFolderView();
}
export const selectFolderFilter = (e) => {
    DOMController.removeActiveChildNodes(e);
    Todo.setFolderFilter(e.target.id);
    updateFolderView();
}

export const updateFolderView = () => {
    const folderFilter = Todo.getFolderFilter();
    const selectedFolder = DOMController.getSelectedFolder();
    if (selectedFolder === 'prj') {
        displayProjects(folderFilter);
    } else if (selectedFolder === 'tag') {
        displayTags(folderFilter);
    }
}

export const writeHeaderText = () => {
    const { findIndexOfObj, getFilteredProjects, getProjectId } = Todo;
    const project = getFilteredProjects();
    const index = findIndexOfObj(project, '_id', getProjectId());
    const textHeader = project[index]._name || '';
    DOMController.displayCurrentProject(textHeader);
}

export const hideTaskHandler = () => {
    Todo.setProjectId('');
    const projectId = Todo.getProjectId();
    if (projectId) return;
    DOMController.manuallyToggleTaskHandler(true);
}

//EVENT CALLBACK FUNCTIONS
export const switchFilterTab = (event) => {
    selectFolderFilter(event);
    updateFolderView();
}

export const getInputValueOnEnter = (event) => {
    const inputVal = event.target.value;
    if (event.key === 'Enter' && Todo.alphabetRegex(inputVal)) {
        addFolderTab(inputVal);
        DOMController.emptyInput(event);
        updateFolderView();
    }
}

export const selectProjectTab = (event, id) => {
    const className = event.target.classList;
    if (className.contains('active')) return;
    DOMController.removeActiveChildNodes(event);
    Todo.setProjectId(id);
    writeHeaderText();
    DOMController.manuallyToggleTaskHandler(false);
}

export const toggleTagTabSelection = (event, id) => {
    const tagTab= event.target;
    DOMController.toggleActive(event);
    if (tagTab.classList.contains('active')) {
        Todo.pushActiveTags(id);
    } else {
        Todo.deselectTag(id);
    }
}

export const removeFolderTab = (id) => {
    const { deleteProject, deleteTag } = Todo;
    const selectedFolder = DOMController.getSelectedFolder();
    selectedFolder === 'prj' ? deleteProject(id) : deleteTag(id);
    updateFolderView();
}

export const removeProjectTabAndView = (id) => {
    removeFolderTab(id);
    hideTaskHandler();
    DOMController.displayCurrentProject('');
}

export const selectFirstProjectTab = () => {
    const project = Todo.getFilteredProjects();
    if (project.length) {
        Todo.setProjectId(project[0]._id);
    }
    const firstPrjTab = document.querySelectorAll('.folder__tab');
    DOMController.addActiveClassName(firstPrjTab[0]);
}

export const toggleEditInput = (inputEl, nameEl) => {
    inputEl.classList.toggle('hide');
    nameEl.classList.toggle('hide');
}

export const editProjectTab = (event, { id, inputEl, nameEl }) => {
    const newPrjName = event.target.value;
    if (event.key === 'Enter' && Todo.alphabetRegex(newPrjName)) {
        Todo.setProjectNameById(event, id);
        DOMController.emptyInput(event);
        nameEl.textContent = newPrjName;
        toggleEditInput(inputEl, nameEl);
        updateTodoView(event);
    }
}

export const customAlert = (props, callback) => {
    const { action, item, id } = props;
    const confirmedResponse
        = `Are you sure you want to ${action} ${item}?`;
    swal(confirmedResponse, {
        buttons: {
            confirm: 'Yes',
            cancel: 'Cancel',
        },
    })
    .then((outcome) => {
        if(outcome){
            callback(id);
        }
    });
}


export const updateTodoView = (event) => {
    DOMController.removeActiveChildNodes(event);
    writeHeaderText();
}

//Initial mount
const defaultDataToBeDisplayed = () => {
    selectFirstProjectTab();
    writeHeaderText();
}

export const initialMount = () => {
    if (!Todo.getFilteredProjects().length) return;
    displayProjects();
    defaultDataToBeDisplayed();
}