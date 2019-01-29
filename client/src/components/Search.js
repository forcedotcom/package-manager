import React from 'react';
import debounce from "lodash.debounce";
import {Icon} from "./Icons";
import {iconForType} from "../Constants";
import * as searchService from "../services/SearchService";
import * as nav from "../services/nav";

export default class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {results: [], term: '', selected: 0};
		this.changeHandler = this.changeHandler.bind(this);
		this.keyHandler = this.keyHandler.bind(this);
		this.searchInput = React.createRef();
		this.focusSearchInput = this.focusSearchInput.bind(this);

		// Special window-level handler to focus our global search bar
		window.addEventListener('keydown', e => {
			switch(e.key) {
				case "/":
					this.focusSearchInput();
					e.preventDefault();
					break;
				default:
					break;
			}
		});
	}

	focusSearchInput() {
		this.searchInput.current.focus();
	}

	openResult(result) {
		nav.toPath(result.type, result.id);
	}

	changeHandler(event) {
		this.setState({term: event.target.value});
		if (event.target.value) {
			this.debounceSearchHandler(event.target.value);
		}
	}

	keyHandler(event) {
		let selected = this.state.selected;
		switch(event.key) {
			case "Escape":
				this.setState({results: [], term: ''});
				break;
			case "ArrowUp":
				selected--;
				if (selected < 0)
					selected = this.state.results.length-1;

				this.state.results[selected].ref.current.scrollIntoView({block: "center", inline: "nearest"});
				this.setState({selected});
				break;
			case "ArrowDown":
				selected++;
				if (selected > this.state.results.length-1)
					selected = 0;

				this.state.results[selected].ref.current.scrollIntoView({block: "center", inline: "nearest"});
				this.setState({selected});
				break;
			case "Enter":
				this.openResult(this.state.results[this.state.selected]);
				break;
			default:
				return;

		}
	}

	searchHandler(value) {
		searchService.requestByTerm(value).then(results => {
			results.forEach(result => result.ref = React.createRef());
			this.setState({results});
		});
	}

	debounceSearchHandler = debounce(this.searchHandler, 250);

	render() {
		const results = this.state.results.map((result, index) =>
			(<li key={index} className="slds-listbox__item" onClick={e => this.openResult(result)}>
				<div id={`option${index}`} ref={result.ref}
					 style={this.state.selected === index ? {backgroundColor: "#f3f3f3"} : {}}
					 className="slds-media slds-listbox__option slds-listbox__option_entity slds-listbox__option_has-meta">
					<span className="slds-media__figure slds-listbox__option-icon">
					  <span className="slds-icon_container slds-icon-standard-account">
						<Icon name={iconForType(result.type).name} category={iconForType(result.type).category}/>
					  </span>
					</span>
					<span className="slds-media__body">
					  <span className="slds-listbox__option-text slds-listbox__option-text_entity">{result.title}</span>
					  <span className="slds-listbox__option-meta slds-listbox__option-meta_entity">{result.detail}</span>
					</span>
				</div>
			</li>)
		);

		return (
			<div onKeyDown={this.keyHandler} style={{padding: "0 10px 0 40px", minWidth: "220px", maxWidth: "560px"}} className="slds-global-header__item slds-global-header__item_search">
				<div className="slds-form-element">
					<div className="slds-form-element__control">
						<div className="slds-combobox-group">
							<div className="slds-combobox_container slds-combobox-addon_end">
								<div className={`slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click ${results.length > 0 ? "slds-is-open" : ""}`}>
									<div className="slds-combobox__form-element slds-input-has-icon slds-input-has-icon_left slds-global-search__form-element">
										<span className="slds-icon_container slds-icon-utility-search slds-input__icon slds-input__icon_left">
											<svg className="slds-icon slds-icon slds-icon_xx-small slds-icon-text-default">
												<use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#search"/>
											</svg>
										</span>
										<input ref={this.searchInput} type="text" className="slds-input slds-combobox__input slds-has-focus slds-combobox__input-value"
											    autoComplete="off" placeholder="Find org by id or name.  Type '/' to focus." value={this.state.term}
												onChange={this.changeHandler}/>
									</div>
									<div className="slds-dropdown slds-dropdown_length-with-icon-7 slds-dropdown_fluid">
										<ul className="slds-listbox slds-listbox_vertical">
											{results}
										</ul>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}
}