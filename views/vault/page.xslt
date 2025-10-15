<?xml version="1.0" ?>
<!--
//
//  Copyright (c) by Hugo Leisink <hugo@leisink.net>
//  This file is part of the Banshee PHP framework
//  https://www.banshee-php.org/
//
//  Licensed under The MIT License
//
//-->
<xsl:stylesheet version="1.1" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:import href="../banshee/main.xslt" />

<!--
//
//  Overview template
//
//-->
<xsl:template match="overview">
<h2>Public pages</h2>
<table class="table table-striped table-hover table-condensed">
<thead>
<tr><th>URL</th><th>Title</th><th>Language</th><th>Visible</th></tr>
</thead>
<tbody>
<xsl:for-each select="pages/page[private=0]">
	<tr onClick="javascript:document.location='/{/output/page}/{@id}'">
	<td><xsl:value-of select="url" /></td>
	<td><xsl:value-of select="title" /></td>
	<td><xsl:value-of select="language" /></td>
	<td><xsl:value-of select="visible" /></td>
	</tr>
</xsl:for-each>
</tbody>
</table>

<h2 class="spacer">Private pages</h2>
<table class="table table-striped table-hover table-condensed">
<thead>
<tr><th>URL</th><th>Title</th><th>Language</th><th>Visible</th></tr>
</thead>
<tbody>
<xsl:for-each select="pages/page[private=1]">
	<tr onClick="javascript:document.location='/{/output/page}/{@id}'">
	<td><xsl:value-of select="url" /></td>
	<td><xsl:value-of select="title" /></td>
	<td><xsl:value-of select="language" /></td>
	<td><xsl:value-of select="visible" /></td>
	</tr>
</xsl:for-each>
</tbody>
</table>

<form action="/{/output/page}" method="post" class="clear">
<div class="btn-group">
<a href="/{/output/page}/new" class="btn btn-default">New page</a>
<a href="/vault" class="btn btn-default">Back</a>
<xsl:if test="@hiawatha='yes'">
<input type="submit" name="submit_button" value="Clear Hiawatha cache" class="btn btn-default" onClick="javascript:return confirm('CLEAR: Are you sure?')" />
</xsl:if>
</div>
</form>
</xsl:template>

<!--
//
//  Edit template
//
//-->
<xsl:template match="edit">
<xsl:call-template name="show_messages" />
<form action="/{/output/page}" method="post">
<xsl:if test="page/@id">
<input type="hidden" name="id" value="{page/@id}" />
</xsl:if>

<xsl:if test="@preview">
<div id="preview" class="preview">
<div class="preview-heading">Preview of <xsl:value-of select="page/url" />
	<span class="width">
		<img src="/images/icons/phone.png" onClick="javascript:set_preview_width('320px')" />
		<img src="/images/icons/tablet.png" onClick="javascript:set_preview_width('720px')" />
		<img src="/images/icons/desktop.png" onClick="javascript:set_preview_width('')"  />
	</span>
	<span class="glyphicon glyphicon-remove-circle close_preview" onClick="javascript:close_preview(this, '{@preview}')"></span>
</div>
<div class="preview-body"><iframe src="{@preview}" onLoad="javascript:preview_loaded('{@preview}')" /></div>
</div>
</xsl:if>

<div class="row">

<div class="col-sm-6">
<div class="form-group">
<label for="url">URL:</label>
<input type="text" id="url" name="url" value="{page/url}" class="form-control" />
</div>
<div class="form-group">
<label for="language">Language:</label>
<select id="language" name="language" class="form-control">
<xsl:for-each select="languages/language">
<option value="{@code}">
	<xsl:if test="@code=../../page/language"><xsl:attribute name="selected">selected</xsl:attribute></xsl:if>
	<xsl:value-of select="." />
</option>
</xsl:for-each>
</select>
</div>
<div class="form-group">
<label for="layout">Layout:</label>
<select id="layout" name="layout" class="form-control">
<xsl:for-each select="layouts/layout">
<option value="{.}">
	<xsl:if test=".=../@current"><xsl:attribute name="selected">selected</xsl:attribute></xsl:if>
	<xsl:value-of select="." />
</option>
</xsl:for-each>
</select>
</div>
<div class="row">
<div class="col-xs-6">
<label for="visible">Visible:</label>
<input type="checkbox" id="visible" name="visible">
<xsl:if test="page/visible='yes'"><xsl:attribute name="checked">checked</xsl:attribute></xsl:if>
</input>
</div>
<div class="col-xs-6">
<label for="back">Back link:</label>
<input type="checkbox" id="back" name="back">
<xsl:if test="page/back='yes'"><xsl:attribute name="checked">checked</xsl:attribute></xsl:if>
</input>
</div>
<div class="col-xs-6">
<label for="private">Private:</label>
<input type="checkbox" id="private" name="private" onClick="javascript:$('div#roles').toggle();">
<xsl:if test="page/private='yes'"><xsl:attribute name="checked">checked</xsl:attribute></xsl:if>
</input>
</div>
<div class="col-xs-6">
<label for="form">Form:</label>
<input type="checkbox" id="form" name="form" onClick="javascript:$('div#formsettings').toggle();">
<xsl:if test="page/form='yes'"><xsl:attribute name="checked">checked</xsl:attribute></xsl:if>
</input>
</div>
</div>
<div id="roles" class="well">
<div class="row">
<xsl:for-each select="roles/role">
<div class="col-xs-6"><input type="checkbox" name="roles[{@id}]">
<xsl:if test="@checked='yes' or @id=$admin_role_id">
<xsl:attribute name="checked">checked</xsl:attribute>
</xsl:if>
<xsl:if test="@id=$admin_role_id"><xsl:attribute name="disabled">disabled</xsl:attribute></xsl:if>
</input><xsl:value-of select="." /></div>
</xsl:for-each>
</div>
</div>
</div>

<div class="col-sm-6">
<div class="form-group">
<label for="title">Title:</label>
<input type="text" id="title" name="title" value="{page/title}" class="form-control" />
</div>
<div class="form-group">
<label for="description">Description:</label>
<input type="text" id="description" name="description" value="{page/description}" class="form-control" />
</div>
<div class="form-group">
<label for="keywords">Keywords:</label>
<input type="text" id="keywords" name="keywords" value="{page/keywords}" class="form-control" />
</div>
<div class="form-group">
<label for="style">Style:</label>
<textarea id="style" name="style" class="form-control"><xsl:value-of select="page/style" /></textarea>
</div>
</div>

</div>

<div class="form-group">
<label for="editor">Content:</label>
<textarea id="editor" name="content" class="form-control"><xsl:value-of select="page/content" /></textarea>
</div>
<xsl:if test="blocks">
<div class="form-group">
<label for="blocks">Available dynamic blocks:</label>
<div><xsl:value-of select="blocks" /></div>
</div>
</xsl:if>

<div id="formsettings">
<h2>Form settings</h2>
<div class="form-group">
<label for="form_submit">Text on submit button:</label>
<input type="text" id="form_submit" name="form_submit" value="{page/form_submit}" class="form-control" />
</div>
<div class="form-group">
<label for="form_submit">E-mail address to send results to:</label>
<input type="text" id="form_email" name="form_email" value="{page/form_email}" class="form-control" />
</div>
<div class="form-group">
<label for="form_done">Text to show after submit:</label>
<textarea id="form_done" name="form_done" class="form-control"><xsl:value-of select="page/form_done" /></textarea>
</div>
</div>

<div class="btn-group">
<input type="submit" name="submit_button" value="Save page" class="btn btn-default" />
<input type="submit" name="submit_button" value="Preview page" class="btn btn-default" />
<a href="/{/output/page}" class="btn btn-default">Cancel</a>
<xsl:if test="page/@id">
<input type="submit" name="submit_button" value="Delete page" class="btn btn-default" onClick="javascript:return confirm('DELETE: Are you sure?')" />
</xsl:if>
</div>
</form>

<div id="help">
<h3>Back link</h3>
<p>Selecting the 'Back link' checkbox adds a back-button to the page, which links to the current URL with the last part removed. For example, a back-button at /support/contact links to /support.</p>

<h3>Form</h3>
<p>Selecting the 'Form' checkbox enables the form functionality for this page. You can add form elements via a simple script language. The script consist of multiple lines that can be placed throughout the page. The format of each script line is:</p>
<pre>{{type label}}</pre>
<p>The label is the text that is placed above the form element. The type defines the form element type and can be one of the following:</p>

<ul>
<li><b>line:</b> A single text line.<br />
<i>Example:</i> {{line Name}}</li>
<li><b>email:</b> A singe text line containing an e-mail address.<br />
<i>Example:</i> {{email E-mail address}}</li>
<li><b>number:</b> A singe text line containing a number.<br />
<i>Example:</i> {{number Your age}}</li>
<li><b>text:</b> A textbox for a larger text.<br />
<i>Example:</i> {{text Question or comment}}</li>
<li><b>checkbox:</b> A checkbox that results in a 'yes' or a 'no'.<br />
<i>Example:</i> {{checkbox Subscribe to newsletter}}</li>
<li><b>choice:</b> A pulldown menu with mutiple options. The label must be followed by a colon and the multiple options divided by a slash.<br />
<i>Example:</i> {{choice Language:English/Dutch/French/German}}</li>
<li><b>date:</b> An input box with a date selector pop-up.<br />
<i>Example:</i> {{date Your birthday}}</li>
</ul>

<p>If 'required' is placed before the element type, the user must fill in that form element before submitting the form. For example: {{required line Name}}.</p>

<xsl:if test="blocks">
<h3>Dynamic blocks</h3>
<p>By adding a tag &lt;dynamic <i>name</i> /&gt;, you can add dynamic content to this page.</p>
<p>The <i>name</i> of the dynamic content, must have a matching function in libraries/dynamic_blocks.php and a matching template in views/banshee/dynamic_blocks.xslt. Styles can be placed in public/css/banshee/dynamic_blocks.css.</p>
</xsl:if>
</div>
</xsl:template>

<!--
//
//  Content template
//
//-->
<xsl:template match="content">
<img src="/images/icons/page.png" class="title_icon" />
<h1>Page administration</h1>
<xsl:apply-templates select="overview" />
<xsl:apply-templates select="edit" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
