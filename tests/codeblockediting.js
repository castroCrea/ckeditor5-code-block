/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/* global document */

import CodeBlockEditing from '../src/codeblockediting';
import CodeBlockCommand from '../src/codeblockcommand';
import IndentCodeBlockCommand from '../src/indentcodeblockcommand';

import AlignmentEditing from '@ckeditor/ckeditor5-alignment/src/alignmentediting';
import BoldEditing from '@ckeditor/ckeditor5-basic-styles/src/bold/boldediting';
import Enter from '@ckeditor/ckeditor5-enter/src/enter';
import ShiftEnter from '@ckeditor/ckeditor5-enter/src/shiftenter';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import Undo from '@ckeditor/ckeditor5-undo/src/undo';
import DomEventData from '@ckeditor/ckeditor5-engine/src/view/observer/domeventdata';
import IndentEditing from '@ckeditor/ckeditor5-indent/src/indentediting';

import ClassicTestEditor from '@ckeditor/ckeditor5-core/tests/_utils/classictesteditor';
import { getCode } from '@ckeditor/ckeditor5-utils/src/keyboard';
import { getData as getModelData, setData as setModelData, stringify } from '@ckeditor/ckeditor5-engine/src/dev-utils/model';
import { getData as getViewData } from '@ckeditor/ckeditor5-engine/src/dev-utils/view';

import { _clear as clearTranslations, add as addTranslations } from '@ckeditor/ckeditor5-utils/src/translation-service';

describe( 'CodeBlockEditing', () => {
	let editor, element, model, view, viewDoc;

	before( () => {
		addTranslations( 'en', {
			'Plain text': 'Plain text'
		} );

		addTranslations( 'pl', {
			'Plain text': 'Zwykły tekst'
		} );
	} );

	after( () => {
		clearTranslations();
	} );

	beforeEach( () => {
		element = document.createElement( 'div' );
		document.body.appendChild( element );

		return ClassicTestEditor
			.create( element, {
				language: 'en',
				plugins: [ CodeBlockEditing, AlignmentEditing, BoldEditing, Enter, Paragraph, Undo ]
			} )
			.then( newEditor => {
				editor = newEditor;
				model = editor.model;
				view = editor.editing.view;
				viewDoc = view.document;
			} );
	} );

	afterEach( () => {
		return editor.destroy().then( () => element.remove() );
	} );

	it( 'defines plugin name', () => {
		expect( CodeBlockEditing.pluginName ).to.equal( 'CodeBlockEditing' );
	} );

	it( 'defines plugin dependencies', () => {
		expect( CodeBlockEditing.requires ).to.have.members( [ ShiftEnter ] );
	} );

	describe( 'config', () => {
		describe( 'languages', () => {
			describe( 'default value', () => {
				it( 'should be set', () => {
					expect( editor.config.get( 'codeBlock.languages' ) ).to.deep.equal( [
						{ class: 'language-plaintext', label: 'Plain text' },
						{ class: 'language-c', label: 'C' },
						{ class: 'language-cs', label: 'C#' },
						{ class: 'language-cpp', label: 'C++' },
						{ class: 'language-css', label: 'CSS' },
						{ class: 'language-diff', label: 'Diff' },
						{ class: 'language-xml', label: 'HTML/XML' },
						{ class: 'language-java', label: 'Java' },
						{ class: 'language-javascript', label: 'JavaScript' },
						{ class: 'language-php', label: 'PHP' },
						{ class: 'language-python', label: 'Python' },
						{ class: 'language-ruby', label: 'Ruby' },
						{ class: 'language-typescript', label: 'TypeScript' }
					] );
				} );
			} );

			it( 'should be recognized when loading data', () => {
				return ClassicTestEditor.create(
					'<pre><code class="language-foo">bar</code></pre>' +
					'<pre><code class="language-bar">baz</code></pre>',
					{
						plugins: [ CodeBlockEditing ],
						codeBlock: {
							languages: [
								{ class: 'language-foo', label: 'Foo' },
								{ class: 'language-bar', label: 'Bar' },
							]
						}
					} )
					.then( editor => {
						model = editor.model;

						expect( getModelData( model ) ).to.equal(
							'<codeBlock language="language-foo">[]bar</codeBlock>' +
							'<codeBlock language="language-bar">baz</codeBlock>'
						);

						return editor.destroy();
					} );
			} );

			it( 'should use the first if the code in data has no language', () => {
				return ClassicTestEditor
					.create( '<pre><code>bar</code></pre>', {
						plugins: [ CodeBlockEditing ],
						codeBlock: {
							languages: [
								{ class: 'language-foo', label: 'Foo' },
								{ class: 'language-bar', label: 'Bar' }
							]
						}
					} )
					.then( editor => {
						model = editor.model;

						expect( getModelData( model ) ).to.equal( '<codeBlock language="language-foo">[]bar</codeBlock>' );

						return editor.destroy();
					} );
			} );

			it( 'should use the first if the code in data has an invalid language', () => {
				return ClassicTestEditor
					.create( '<pre><code class="baz">bar</code></pre>', {
						plugins: [ CodeBlockEditing ],
						codeBlock: {
							languages: [
								{ class: 'language-foo', label: 'Foo' },
								{ class: 'language-bar', label: 'Bar' }
							]
						}
					} )
					.then( editor => {
						model = editor.model;

						expect( getModelData( model ) ).to.equal( '<codeBlock language="language-foo">[]bar</codeBlock>' );

						return editor.destroy();
					} );
			} );
		} );

		describe( 'indentSequence', () => {
			describe( 'default value', () => {
				it( 'should be set', () => {
					expect( editor.config.get( 'codeBlock.indentSequence' ) ).to.equal( '	' );
				} );
			} );
		} );
	} );

	it( 'adds a "codeBlock" command', () => {
		expect( editor.commands.get( 'codeBlock' ) ).to.be.instanceOf( CodeBlockCommand );
	} );

	it( 'adds an "indentCodeBlock" command', () => {
		expect( editor.commands.get( 'indentCodeBlock' ) ).to.be.instanceOf( IndentCodeBlockCommand );
	} );

	it( 'adds an "outdentCodeBlock" command', () => {
		expect( editor.commands.get( 'outdentCodeBlock' ) ).to.be.instanceOf( IndentCodeBlockCommand );
	} );

	it( 'allows for codeBlock in the $root', () => {
		expect( model.schema.checkChild( [ '$root' ], 'codeBlock' ) ).to.be.true;
	} );

	it( 'disallows for codeBlock in the other codeBlock', () => {
		expect( model.schema.checkChild( [ '$root', 'codeBlock' ], 'codeBlock' ) ).to.be.false;
	} );

	it( 'allows only for $text in codeBlock', () => {
		expect( model.schema.checkChild( [ '$root', 'codeBlock' ], '$text' ) ).to.equal( true );
		expect( model.schema.checkChild( [ '$root', 'codeBlock' ], '$block' ) ).to.equal( false );
		expect( model.schema.checkChild( [ '$root', 'codeBlock' ], 'codeBlock' ) ).to.equal( false );
	} );

	it( 'disallows all attributes (except "language") for codeBlock', () => {
		setModelData( model, '<codeBlock language="language-css">f[o]o</codeBlock>' );

		editor.execute( 'alignment', { value: 'right' } );
		editor.execute( 'bold' );

		expect( getModelData( model ) ).to.equal( '<codeBlock language="language-css">f[o]o</codeBlock>' );
	} );

	describe( 'tab key handling', () => {
		let domEvtDataStub;

		beforeEach( () => {
			domEvtDataStub = {
				keyCode: getCode( 'Tab' ),
				preventDefault: sinon.spy(),
				stopPropagation: sinon.spy()
			};

			sinon.spy( editor, 'execute' );
		} );

		afterEach( () => {
			editor.execute.restore();
		} );

		it( 'should execute indentCodeBlock command on tab key', () => {
			setModelData( model, '<codeBlock language="language-plaintext">[]foo</codeBlock>' );

			editor.editing.view.document.fire( 'keydown', domEvtDataStub );

			sinon.assert.calledOnce( editor.execute );
			sinon.assert.calledWithExactly( editor.execute, 'indentCodeBlock' );
			sinon.assert.calledOnce( domEvtDataStub.preventDefault );
			sinon.assert.calledOnce( domEvtDataStub.stopPropagation );
		} );

		it( 'should execute outdentCodeBlock command on Shift+Tab keystroke', () => {
			domEvtDataStub.keyCode += getCode( 'Shift' );

			setModelData( model, '<codeBlock language="language-plaintext">[]foo</codeBlock>' );

			// '<codeBlock language="language-plaintext">	[]foo</codeBlock>
			model.change( writer => {
				writer.insertText( '	', model.document.getRoot().getChild( 0 ) );
			} );

			editor.editing.view.document.fire( 'keydown', domEvtDataStub );

			sinon.assert.calledOnce( editor.execute );
			sinon.assert.calledWithExactly( editor.execute, 'outdentCodeBlock' );
			sinon.assert.calledOnce( domEvtDataStub.preventDefault );
			sinon.assert.calledOnce( domEvtDataStub.stopPropagation );
		} );

		it( 'should not indent if command is disabled', () => {
			setModelData( model, '<paragraph>[]foo</paragraph>' );

			editor.editing.view.document.fire( 'keydown', domEvtDataStub );

			expect( editor.execute.called ).to.be.false;
			sinon.assert.notCalled( domEvtDataStub.preventDefault );
			sinon.assert.notCalled( domEvtDataStub.stopPropagation );
		} );

		it( 'should not indent or outdent if alt+tab is pressed', () => {
			domEvtDataStub.keyCode += getCode( 'alt' );

			setModelData( model, '<codeBlock language="language-plaintext">[]foo</codeBlock>' );

			editor.editing.view.document.fire( 'keydown', domEvtDataStub );

			expect( editor.execute.called ).to.be.false;
			sinon.assert.notCalled( domEvtDataStub.preventDefault );
			sinon.assert.notCalled( domEvtDataStub.stopPropagation );
		} );
	} );

	describe( 'enter key handling', () => {
		it( 'should force shiftEnter command when pressing enter inside a codeBlock', () => {
			const enterCommand = editor.commands.get( 'enter' );
			const shiftEnterCommand = editor.commands.get( 'shiftEnter' );

			sinon.spy( enterCommand, 'execute' );
			sinon.spy( shiftEnterCommand, 'execute' );

			setModelData( model, '<codeBlock>foo[]bar</codeBlock>' );

			viewDoc.fire( 'enter', getEvent() );

			expect( getModelData( model ) ).to.equal( '<codeBlock>foo<softBreak></softBreak>[]bar</codeBlock>' );
			sinon.assert.calledOnce( shiftEnterCommand.execute );
			sinon.assert.notCalled( enterCommand.execute );
		} );

		it( 'should execute enter command when pressing enter out of codeBlock', () => {
			const enterCommand = editor.commands.get( 'enter' );
			const shiftEnterCommand = editor.commands.get( 'shiftEnter' );

			sinon.spy( enterCommand, 'execute' );
			sinon.spy( shiftEnterCommand, 'execute' );

			setModelData( model, '<paragraph>foo[]bar</paragraph>' );

			viewDoc.fire( 'enter', getEvent() );

			expect( getModelData( model ) ).to.equal( '<paragraph>foo</paragraph><paragraph>[]bar</paragraph>' );
			sinon.assert.calledOnce( enterCommand.execute );
			sinon.assert.notCalled( shiftEnterCommand.execute );
		} );

		describe( 'indentation retention', () => {
			it( 'should work when indentation is with spaces', () => {
				setModelData( model, '<codeBlock language="language-css">foo[]</codeBlock>' );

				model.change( writer => {
					// <codeBlock language="language-css">  foo[]</codeBlock>
					writer.insertText( '  ', model.document.getRoot().getChild( 0 ), 0 );
				} );

				viewDoc.fire( 'enter', getEvent() );

				expect( getModelData( model ) ).to.equal(
					'<codeBlock language="language-css">  foo<softBreak></softBreak>  []</codeBlock>' );

				editor.execute( 'undo' );

				expect( getModelData( model ) ).to.equal( '<codeBlock language="language-css">  foo[]</codeBlock>' );
			} );

			it( 'should work when indentation is with tabs', () => {
				setModelData( model, '<codeBlock language="language-css">foo[]</codeBlock>' );

				model.change( writer => {
					// <codeBlock language="language-css">	foo[]</codeBlock>
					writer.insertText( '	', model.document.getRoot().getChild( 0 ), 0 );
				} );

				viewDoc.fire( 'enter', getEvent() );

				expect( getModelData( model ) ).to.equal(
					'<codeBlock language="language-css">	foo<softBreak></softBreak>	[]</codeBlock>' );

				editor.execute( 'undo' );

				expect( getModelData( model ) ).to.equal( '<codeBlock language="language-css">	foo[]</codeBlock>' );
			} );

			it( 'should retain only the last line', () => {
				setModelData( model, '<codeBlock language="language-css">foo<softBreak></softBreak>bar[]</codeBlock>' );

				model.change( writer => {
					// <codeBlock language="language-css">  foo<softBreak></softBreak>	bar[]</codeBlock>
					writer.insertText( '	', model.document.getRoot().getChild( 0 ), 4 );
					writer.insertText( '  ', model.document.getRoot().getChild( 0 ), 0 );
				} );

				viewDoc.fire( 'enter', getEvent() );

				expect( getModelData( model ) ).to.equal(
					'<codeBlock language="language-css">  foo<softBreak></softBreak>	bar<softBreak></softBreak>	[]</codeBlock>' );

				editor.execute( 'undo' );

				expect( getModelData( model ) ).to.equal(
					'<codeBlock language="language-css">  foo<softBreak></softBreak>	bar[]</codeBlock>' );
			} );

			it( 'should retain when the selection is non–collapsed', () => {
				setModelData( model, '<codeBlock language="language-css">f[o]o</codeBlock>' );

				model.change( writer => {
					// <codeBlock language="language-css">    f[o]o</codeBlock>
					writer.insertText( '    ', model.document.getRoot().getChild( 0 ), 0 );
				} );

				viewDoc.fire( 'enter', getEvent() );

				expect( getModelData( model ) ).to.equal(
					'<codeBlock language="language-css">    f<softBreak></softBreak>    []o</codeBlock>' );

				editor.execute( 'undo' );

				expect( getModelData( model ) ).to.equal( '<codeBlock language="language-css">    f[o]o</codeBlock>' );
			} );

			it( 'should consider only leading white-spaces', () => {
				setModelData( model, '<codeBlock language="language-css">foo[]</codeBlock>' );

				model.change( writer => {
					// <codeBlock language="language-css">  foo []</codeBlock>
					writer.insertText( ' ', model.document.getRoot().getChild( 0 ), 3 );
					writer.insertText( '  ', model.document.getRoot().getChild( 0 ), 0 );
				} );

				viewDoc.fire( 'enter', getEvent() );

				expect( getModelData( model ) ).to.equal(
					'<codeBlock language="language-css">  foo <softBreak></softBreak>  []</codeBlock>' );

				editor.execute( 'undo' );

				expect( getModelData( model ) ).to.equal( '<codeBlock language="language-css">  foo []</codeBlock>' );
			} );

			it( 'should not work when there is some non-whitespace character', () => {
				setModelData( model, '<codeBlock language="language-css">foo[]</codeBlock>' );

				model.change( writer => {
					// <codeBlock language="language-css">foo   []</codeBlock>
					writer.insertText( '   ', model.document.getRoot().getChild( 0 ), 3 );
				} );

				viewDoc.fire( 'enter', getEvent() );

				expect( getModelData( model ) ).to.equal(
					'<codeBlock language="language-css">foo   <softBreak></softBreak>[]</codeBlock>' );
			} );
		} );

		describe( 'leaving block using the enter key', () => {
			describe( 'leaving the block end', () => {
				it( 'should leave the block when pressed twice at the end', () => {
					const spy = sinon.spy( editor.editing.view, 'scrollToTheSelection' );

					setModelData( model, '<codeBlock language="language-css">foo[]</codeBlock>' );

					viewDoc.fire( 'enter', getEvent() );

					expect( getModelData( model ) ).to.equal(
						'<codeBlock language="language-css">foo<softBreak></softBreak>[]</codeBlock>' );

					viewDoc.fire( 'enter', getEvent() );

					expect( getModelData( model ) ).to.equal(
						'<codeBlock language="language-css">foo</codeBlock>' +
						'<paragraph>[]</paragraph>'
					);

					sinon.assert.calledOnce( spy );

					editor.execute( 'undo' );
					expect( getModelData( model ) ).to.equal(
						'<codeBlock language="language-css">foo<softBreak></softBreak>[]</codeBlock>' );

					editor.execute( 'undo' );
					expect( getModelData( model ) ).to.equal( '<codeBlock language="language-css">foo[]</codeBlock>' );
				} );

				it( 'should not leave the block when the selection is not collapsed', () => {
					setModelData( model, '<codeBlock language="language-css">f[oo<softBreak></softBreak>]</codeBlock>' );

					viewDoc.fire( 'enter', getEvent() );

					expect( getModelData( model ) ).to.equal(
						'<codeBlock language="language-css">f<softBreak></softBreak>[]</codeBlock>' );
				} );

				it( 'should not leave the block when pressed twice when in the middle of the code', () => {
					setModelData( model, '<codeBlock language="language-css">fo[]o</codeBlock>' );

					viewDoc.fire( 'enter', getEvent() );

					expect( getModelData( model ) ).to.equal(
						'<codeBlock language="language-css">fo<softBreak></softBreak>[]o</codeBlock>' );

					viewDoc.fire( 'enter', getEvent() );

					expect( getModelData( model ) ).to.equal(
						'<codeBlock language="language-css">fo<softBreak></softBreak><softBreak></softBreak>[]o</codeBlock>' );
				} );

				it( 'should not leave the block when pressed twice at the beginning of the code', () => {
					setModelData( model, '<codeBlock language="language-css">[]foo</codeBlock>' );

					viewDoc.fire( 'enter', getEvent() );

					expect( getModelData( model ) ).to.equal(
						'<codeBlock language="language-css"><softBreak></softBreak>[]foo</codeBlock>' );

					viewDoc.fire( 'enter', getEvent() );

					expect( getModelData( model ) ).to.equal(
						'<codeBlock language="language-css"><softBreak></softBreak><softBreak></softBreak>[]foo</codeBlock>' );
				} );

				it( 'should not leave the block when pressed shift+enter twice at the end of the code', () => {
					setModelData( model, '<codeBlock language="language-css">foo<softBreak></softBreak>[]</codeBlock>' );

					viewDoc.fire( 'enter', getEvent( { isSoft: true } ) );

					expect( getModelData( model ) ).to.equal(
						'<codeBlock language="language-css">foo<softBreak></softBreak><softBreak></softBreak>[]</codeBlock>' );
				} );

				it( 'should clean up the last line if has white–space characters only', () => {
					setModelData( model, '<codeBlock language="language-css">foo<softBreak></softBreak>[]</codeBlock>' );

					model.change( writer => {
						// <codeBlock language="language-css">foo<softBreak></softBreak>  []</codeBlock>
						writer.insertText( '  ', model.document.getRoot().getChild( 0 ), 4 );
					} );

					viewDoc.fire( 'enter', getEvent() );

					expect( getModelData( model ) ).to.equal(
						'<codeBlock language="language-css">foo</codeBlock><paragraph>[]</paragraph>' );
				} );
			} );

			describe( 'leaving the block at the beginning', () => {
				it( 'should leave the block when pressed at the beginning in a new line', () => {
					const spy = sinon.spy( editor.editing.view, 'scrollToTheSelection' );

					setModelData( model, '<codeBlock language="language-css">[]<softBreak></softBreak>foo</codeBlock>' );

					viewDoc.fire( 'enter', getEvent() );

					expect( getModelData( model ) ).to.equal(
						'<paragraph>[]</paragraph>' +
						'<codeBlock language="language-css">foo</codeBlock>'
					);

					sinon.assert.calledOnce( spy );

					editor.execute( 'undo' );
					expect( getModelData( model ) ).to.equal(
						'<codeBlock language="language-css">[]<softBreak></softBreak>foo</codeBlock>' );
				} );

				it( 'should not leave the block when the selection is not collapsed (#1)', () => {
					setModelData( model, '<codeBlock language="language-css">[f]<softBreak></softBreak>oo</codeBlock>' );

					viewDoc.fire( 'enter', getEvent() );

					expect( getModelData( model ) ).to.equal(
						'<codeBlock language="language-css"><softBreak></softBreak>[]<softBreak></softBreak>oo</codeBlock>' );
				} );

				it( 'should not leave the block when the selection is not collapsed (#2)', () => {
					setModelData( model, '<codeBlock language="language-css">[<softBreak></softBreak>oo]</codeBlock>' );

					viewDoc.fire( 'enter', getEvent() );

					expect( getModelData( model ) ).to.equal(
						'<codeBlock language="language-css"><softBreak></softBreak>[]</codeBlock>' );
				} );

				it( 'should not leave the block when pressed shift+enter at the beginning of the code', () => {
					setModelData( model, '<codeBlock language="language-css">[]<softBreak></softBreak>foo</codeBlock>' );

					viewDoc.fire( 'enter', getEvent( { isSoft: true } ) );

					expect( getModelData( model ) ).to.equal(
						'<codeBlock language="language-css"><softBreak></softBreak>[]<softBreak></softBreak>foo</codeBlock>' );
				} );

				it( 'should not leave the block when there is some text after the selection', () => {
					setModelData( model, '<codeBlock language="language-css">[]foo<softBreak></softBreak>foo</codeBlock>' );

					viewDoc.fire( 'enter', getEvent() );

					expect( getModelData( model ) ).to.equal(
						'<codeBlock language="language-css"><softBreak></softBreak>[]foo<softBreak></softBreak>foo</codeBlock>' );
				} );

				it( 'should not leave the block when there is some text before the selection', () => {
					setModelData( model, '<codeBlock language="language-css">[]<softBreak></softBreak>foo</codeBlock>' );

					// <codeBlock language="language-css">    []<softBreak></softBreak>foo</codeBlock>
					model.change( writer => {
						writer.insertText( '    ', model.document.getRoot().getChild( 0 ), 0 );
					} );

					viewDoc.fire( 'enter', getEvent() );

					// Extra spaces before "[]" come from the indentation retention mechanism.
					expect( getModelData( model ) ).to.equal(
						'<codeBlock language="language-css">    <softBreak></softBreak>    []<softBreak></softBreak>foo</codeBlock>' );
				} );
			} );
		} );

		function getEvent( data = {} ) {
			return new DomEventData( viewDoc, {
				preventDefault: sinon.spy()
			}, data );
		}
	} );

	describe( 'indent plugin integration', () => {
		it( 'should add indent code block command to indent command', () => {
			const element = document.createElement( 'div' );
			document.body.appendChild( element );

			return ClassicTestEditor
				.create( element, {
					plugins: [ CodeBlockEditing, AlignmentEditing, BoldEditing, Enter, Paragraph, Undo, IndentEditing ]
				} )
				.then( newEditor => {
					const editor = newEditor;

					const indentCodeBlockCommand = editor.commands.get( 'indentCodeBlock' );
					const indentCommand = editor.commands.get( 'indent' );
					const spy = sinon.spy( indentCodeBlockCommand, 'execute' );

					indentCodeBlockCommand.isEnabled = true;
					indentCommand.execute();

					sinon.assert.calledOnce( spy );

					element.remove();

					return editor.destroy();
				} );
		} );

		it( 'should add outdent code block command to outdent command', () => {
			return ClassicTestEditor
				.create( element, {
					plugins: [ CodeBlockEditing, AlignmentEditing, BoldEditing, Enter, Paragraph, Undo, IndentEditing ]
				} )
				.then( newEditor => {
					const editor = newEditor;

					const outdentCodeBlockCommand = editor.commands.get( 'outdentCodeBlock' );
					const outdentCommand = editor.commands.get( 'outdent' );
					const spy = sinon.spy( outdentCodeBlockCommand, 'execute' );

					outdentCodeBlockCommand.isEnabled = true;
					outdentCommand.execute();

					sinon.assert.calledOnce( spy );

					element.remove();

					return editor.destroy();
				} );
		} );
	} );

	describe( 'editing pipeline m -> v', () => {
		it( 'should convert empty codeBlock to empty pre tag', () => {
			setModelData( model, '<codeBlock language="language-plaintext"></codeBlock>' );

			expect( getViewData( view ) ).to.equal( '<pre data-language="Plain text"><code class="language-plaintext">[]</code></pre>' );
		} );

		it( 'should convert non-empty codeBlock to pre tag', () => {
			setModelData( model, '<codeBlock language="language-plaintext">Foo</codeBlock>' );

			expect( getViewData( view ) ).to.equal( '<pre data-language="Plain text"><code class="language-plaintext">{}Foo</code></pre>' );
		} );

		it( 'should convert codeBlock with softBreaks to pre tag #1', () => {
			setModelData( model,
				'<codeBlock language="language-plaintext">' +
					'Foo<softBreak></softBreak>' +
					'Bar<softBreak></softBreak>' +
					'Biz' +
				'</codeBlock>'
			);

			expect( getViewData( view ) ).to.equal(
				'<pre data-language="Plain text">' +
					'<code class="language-plaintext">{}Foo<br></br>Bar<br></br>Biz</code>' +
				'</pre>' );
		} );

		it( 'should convert codeBlock with softBreaks to pre tag #2', () => {
			setModelData( model,
				'<codeBlock language="language-plaintext">' +
					'<softBreak></softBreak>' +
					'<softBreak></softBreak>' +
					'Foo' +
					'<softBreak></softBreak>' +
					'<softBreak></softBreak>' +
				'</codeBlock>'
			);

			expect( getViewData( view ) ).to.equal(
				'<pre data-language="Plain text">' +
					'<code class="language-plaintext">[]<br></br><br></br>Foo<br></br><br></br></code>' +
				'</pre>' );
		} );

		it( 'should use localized "Plain text" label', () => {
			const element = document.createElement( 'div' );
			document.body.appendChild( element );

			return ClassicTestEditor
				.create( element, {
					language: 'pl',
					plugins: [ CodeBlockEditing, AlignmentEditing, BoldEditing, Enter, Paragraph ]
				} )
				.then( newEditor => {
					const editor = newEditor;
					const model = editor.model;
					const view = editor.editing.view;

					setModelData( model,
						'<codeBlock language="language-plaintext">foo</codeBlock>'
					);

					expect( getViewData( view ) ).to.equal(
						'<pre data-language="Zwykły tekst">' +
							'<code class="language-plaintext">{}foo</code>' +
						'</pre>' );

					element.remove();

					return editor.destroy();
				} );
		} );
	} );

	describe( 'data pipeline m -> v conversion ', () => {
		it( 'should convert empty codeBlock to empty pre tag', () => {
			setModelData( model, '<codeBlock language="language-plaintext"></codeBlock>' );

			expect( editor.getData( { trim: 'none' } ) ).to.equal( '<pre><code class="language-plaintext">&nbsp;</code></pre>' );
		} );

		it( 'should convert non-empty codeBlock to pre tag', () => {
			setModelData( model, '<codeBlock language="language-plaintext">Foo</codeBlock>' );

			expect( editor.getData() ).to.equal( '<pre><code class="language-plaintext">Foo</code></pre>' );
		} );

		it( 'should convert codeBlock with softBreaks to pre tag #1', () => {
			setModelData( model,
				'<codeBlock language="language-plaintext">' +
					'Foo<softBreak></softBreak>' +
					'Bar<softBreak></softBreak>' +
					'Biz' +
				'</codeBlock>' +
				'<paragraph>A<softBreak></softBreak>B</paragraph>'
			);

			expect( editor.getData() ).to.equal( '<pre><code class="language-plaintext">Foo\nBar\nBiz</code></pre><p>A<br>B</p>' );
		} );

		it( 'should convert codeBlock with softBreaks to pre tag #2', () => {
			setModelData( model,
				'<codeBlock language="language-plaintext">' +
					'<softBreak></softBreak>' +
					'<softBreak></softBreak>' +
					'Foo' +
					'<softBreak></softBreak>' +
					'<softBreak></softBreak>' +
				'</codeBlock>'
			);

			expect( editor.getData() ).to.equal( '<pre><code class="language-plaintext">\n\nFoo\n\n</code></pre>' );
		} );

		it( 'should convert codeBlock with html content', () => {
			setModelData( model, '<codeBlock language="language-plaintext">[]</codeBlock>' );

			model.change( writer => writer.insertText( '<div><p>Foo</p></div>', model.document.selection.getFirstPosition() ) );

			expect( editor.getData() ).to.equal(
				'<pre>' +
					'<code class="language-plaintext">&lt;div&gt;&lt;p&gt;Foo&lt;/p&gt;&lt;/div&gt;</code>' +
				'</pre>' );
		} );

		it( 'should be overridable', () => {
			editor.data.downcastDispatcher.on( 'insert:codeBlock', ( evt, data, api ) => {
				const targetViewPosition = api.mapper.toViewPosition( model.createPositionBefore( data.item ) );
				const code = api.writer.createContainerElement( 'code' );

				api.consumable.consume( data.item, 'insert' );
				api.writer.insert( targetViewPosition, code );
				api.mapper.bindElements( data.item, code );
			}, { priority: 'high' } );

			editor.data.downcastDispatcher.on( 'insert:softBreak', ( evt, data, api ) => {
				const position = api.mapper.toViewPosition( model.createPositionBefore( data.item ) );

				api.consumable.consume( data.item, 'insert' );
				api.writer.insert( position, api.writer.createText( '\n' ) );
			}, { priority: 'highest' } );

			setModelData( model, '<codeBlock language="language-plaintext">Foo<softBreak></softBreak>Bar</codeBlock>' );

			expect( editor.getData() ).to.equal( '<code>Foo\nBar</code>' );
		} );
	} );

	describe( 'data pipeline v -> m conversion ', () => {
		it( 'should not convert empty pre tag to code block', () => {
			editor.setData( '<pre></pre>' );

			expect( getModelData( model ) ).to.equal( '<paragraph>[]</paragraph>' );
		} );

		it( 'should not convert pre with no code child to code block', () => {
			editor.setData( '<pre><samp></samp></pre>' );

			expect( getModelData( model ) ).to.equal( '<paragraph>[]</paragraph>' );
		} );

		it( 'should convert pre > code to code block', () => {
			editor.setData( '<pre><code></code></pre>' );

			expect( getModelData( model ) ).to.equal( '<codeBlock language="language-plaintext">[]</codeBlock>' );
		} );

		it( 'should convert pre > code with multi-line text to code block #1', () => {
			editor.setData( '<pre><code>foo\nbar</code></pre>' );

			expect( getModelData( model ) ).to.equal(
				'<codeBlock language="language-plaintext">[]' +
					'foo' +
					'<softBreak></softBreak>' +
					'bar' +
				'</codeBlock>'
			);
		} );

		it( 'should convert pre > code with multi-line text to code block #2', () => {
			editor.setData( '<pre><code>\n\nfoo\n\n</code></pre>' );

			expect( getModelData( model ) ).to.equal(
				'<codeBlock language="language-plaintext">[]' +
					'<softBreak></softBreak>' +
					'<softBreak></softBreak>' +
					'foo' +
					'<softBreak></softBreak>' +
					'<softBreak></softBreak>' +
				'</codeBlock>'
			);
		} );

		it( 'should convert pre > code with HTML inside', () => {
			editor.setData( '<pre><code><p>Foo</p>\n<p>Bar</p></code></pre>' );

			expect( getModelData( model ) ).to.equal(
				'<codeBlock language="language-plaintext">[]' +
					'<p>Foo</p>' +
					'<softBreak></softBreak>' +
					'<p>Bar</p>' +
				'</codeBlock>'
			);
		} );

		it( 'should convert pre > code tag with HTML and nested pre > code tag', () => {
			editor.setData( '<pre><code><p>Foo</p><pre>Bar</pre><p>Biz</p></code></pre>' );

			expect( getModelData( model ) ).to.equal(
				'<codeBlock language="language-plaintext">[]<p>Foo</p><pre>Bar</pre><p>Biz</p></codeBlock>' );
		} );

		it( 'should convert pre > code tag with escaped html content', () => {
			editor.setData( '<pre><code>&lt;div&gt;&lt;p&gt;Foo&lt;/p&gt;&lt;/div&gt;</code></pre>' );

			expect( getModelData( model ) ).to.equal( '<codeBlock language="language-plaintext">[]<div><p>Foo</p></div></codeBlock>' );
		} );

		it( 'should be overridable', () => {
			editor.data.upcastDispatcher.on( 'element:pre', ( evt, data, api ) => {
				const modelItem = api.writer.createElement( 'codeBlock' );

				api.writer.appendText( 'Hello World!', modelItem );
				api.writer.insert( modelItem, data.modelCursor );
				api.consumable.consume( data.viewItem, { name: true } );

				data.modelCursor = api.writer.createPositionAfter( modelItem );
				data.modelRange = api.writer.createRangeOn( modelItem );
			}, { priority: 'high' } );

			editor.setData( '<pre><code>Foo Bar</code></pre>' );

			expect( getModelData( model ) ).to.equal( '<codeBlock>[]Hello World!</codeBlock>' );
		} );

		it( 'should split parents to correctly upcast the code block', () => {
			editor.setData( '<p>foo<pre><code>x</code></pre>bar</p>' );

			// Note: The empty <paragraph> should not be here. It's a conversion/auto–paragraphing bug.
			expect( getModelData( model ) ).to.equal(
				'<paragraph>[]foo</paragraph>' +
				'<codeBlock language="language-plaintext">x</codeBlock>' +
				'<paragraph>bar</paragraph>' +
				'<paragraph></paragraph>' );
		} );

		it( 'should upcast two code blocks in a row (#1)', () => {
			editor.setData( '<pre><code>foo</code></pre><pre><code>bar</code></pre>' );

			expect( getModelData( model ) ).to.equal(
				'<codeBlock language="language-plaintext">[]foo</codeBlock><codeBlock language="language-plaintext">bar</codeBlock>' );
		} );

		it( 'should upcast two code blocks in a row (#2)', () => {
			editor.setData( `<pre><code>foo</code></pre>
				<pre><code>bar</code></pre>` );

			// Note: The empty <paragraph> in between should not be here. It's a conversion/auto–paragraphing bug.
			expect( getModelData( model ) ).to.equal(
				'<codeBlock language="language-plaintext">[]foo</codeBlock>' +
				'<paragraph> </paragraph>' +
				'<codeBlock language="language-plaintext">bar</codeBlock>' );
		} );

		it( 'should not convert when modelCursor and its ancestors disallow to insert codeBlock', () => {
			model.document.createRoot( '$title', 'title' );

			model.schema.register( '$title', {
				disallow: '$block',
				allow: 'inline'
			} );

			editor.data.set( { title: '<pre><code>foo</code></pre>' } );

			expect( getModelData( model, { rootName: 'title', withoutSelection: true } ) ).to.equal( '' );
		} );
	} );

	describe( 'clipboard integration', () => {
		it( 'should not intercept input when selection anchored outside any code block', () => {
			setModelData( model, '<paragraph>f[]oo</paragraph>' );

			const dataTransferMock = {
				getData: sinon.stub().withArgs( 'text/plain' ).returns( 'bar' )
			};

			viewDoc.fire( 'clipboardInput', {
				dataTransfer: dataTransferMock,
				stop: sinon.spy()
			} );

			expect( getModelData( model ) ).to.equal( '<paragraph>f[]oo</paragraph>' );
			sinon.assert.notCalled( dataTransferMock.getData );
		} );

		it( 'should intercept input when selection anchored in the code block', () => {
			setModelData( model, '<codeBlock language="language-css">f[o]o</codeBlock>' );

			const dataTransferMock = {
				getData: sinon.stub().withArgs( 'text/plain' ).returns( 'bar\nbaz\n' )
			};

			viewDoc.fire( 'clipboardInput', {
				dataTransfer: dataTransferMock,
				stop: sinon.spy()
			} );

			expect( getModelData( model ) ).to.equal(
				'<codeBlock language="language-css">' +
					'fbar' +
					'<softBreak></softBreak>' +
					'baz' +
					'<softBreak></softBreak>' +
					'[]o' +
				'</codeBlock>' );

			sinon.assert.calledOnce( dataTransferMock.getData );
		} );

		describe( 'getSelectedContent()', () => {
			it( 'should not engage when there is nothing selected', () => {
				setModelData( model, '<codeBlock language="language-css">fo[]o<softBreak></softBreak>bar</codeBlock>' );

				expect( stringify( model.getSelectedContent( model.document.selection ) ) ).to.equal( '' );
			} );

			it( 'should wrap a partial multi-line selection into a code block (#1)', () => {
				setModelData( model, '<codeBlock language="language-css">fo[o<softBreak></softBreak>b]ar</codeBlock>' );

				expect( stringify( model.getSelectedContent( model.document.selection ) ) ).to.equal(
					'<codeBlock language="language-css">o<softBreak></softBreak>b</codeBlock>'
				);
			} );

			it( 'should wrap a partial multi-line selection into a code block (#2)', () => {
				setModelData( model, '<codeBlock language="language-css">fo[o<softBreak></softBreak>]bar</codeBlock>' );

				expect( stringify( model.getSelectedContent( model.document.selection ) ) ).to.equal(
					'<codeBlock language="language-css">o<softBreak></softBreak></codeBlock>'
				);
			} );

			it( 'should wrap a partial multi-line selection into a code block (#3)', () => {
				setModelData( model, '<codeBlock language="language-css">[foo<softBreak></softBreak>bar]</codeBlock>' );

				expect( stringify( model.getSelectedContent( model.document.selection ) ) ).to.equal(
					'<codeBlock language="language-css">foo<softBreak></softBreak>bar</codeBlock>'
				);
			} );

			it( 'should wrap a complete single-line selection into a code block', () => {
				setModelData( model, '<codeBlock language="language-css">[foo]</codeBlock>' );

				expect( stringify( model.getSelectedContent( model.document.selection ) ) ).to.equal(
					'<codeBlock language="language-css">foo</codeBlock>'
				);
			} );

			it( 'should wrap a partial single-line selection into an inline code (#1)', () => {
				model.schema.extend( '$text', {
					allowAttributes: 'code'
				} );

				setModelData( model, '<codeBlock language="language-css">[fo]o<softBreak></softBreak>bar</codeBlock>' );

				expect( stringify( model.getSelectedContent( model.document.selection ) ) ).to.equal(
					'<$text code="true">fo</$text>'
				);
			} );

			it( 'should wrap a partial single-line selection into an inline code (#2)', () => {
				model.schema.extend( '$text', {
					allowAttributes: 'code'
				} );

				setModelData( model, '<codeBlock language="language-css">foo<softBreak></softBreak>b[a]r</codeBlock>' );

				expect( stringify( model.getSelectedContent( model.document.selection ) ) ).to.equal(
					'<$text code="true">a</$text>'
				);
			} );

			it( 'should now wrap a partial single-line selection into an inline code when the attribute is disallowed', () => {
				setModelData( model, '<codeBlock language="language-css">foo<softBreak></softBreak>b[a]r</codeBlock>' );

				expect( stringify( model.getSelectedContent( model.document.selection ) ) ).to.equal( 'a' );
			} );

			it( 'should preserve a code block in a cross-selection (#1)', () => {
				setModelData( model,
					'<paragraph>[x</paragraph><codeBlock language="language-css">fo]o<softBreak></softBreak>bar</codeBlock>' );

				expect( stringify( model.getSelectedContent( model.document.selection ) ) ).to.equal(
					'<paragraph>x</paragraph><codeBlock language="language-css">fo</codeBlock>'
				);
			} );

			it( 'should preserve a code block in a cross-selection (#2)', () => {
				setModelData( model,
					'<paragraph>[x</paragraph><codeBlock language="language-css">foo<softBreak></softBreak>b]ar</codeBlock>' );

				expect( stringify( model.getSelectedContent( model.document.selection ) ) ).to.equal(
					'<paragraph>x</paragraph><codeBlock language="language-css">foo<softBreak></softBreak>b</codeBlock>'
				);
			} );

			it( 'should preserve a code block in a cross-selection (#3)', () => {
				setModelData( model,
					'<codeBlock language="language-css">foo<softBreak></softBreak>b[ar</codeBlock><paragraph>x]</paragraph>' );

				expect( stringify( model.getSelectedContent( model.document.selection ) ) ).to.equal(
					'<codeBlock language="language-css">ar</codeBlock><paragraph>x</paragraph>'
				);
			} );
		} );
	} );
} );
