<?xml version="1.0" ?>
<xsl:stylesheet version="1.1" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:import href="banshee/main.xslt" />
<xsl:import href="includes/adventures_pulldown.xslt" />

<!--
//
//  Relations template
//
//-->
<xsl:template match="relations">
<xsl:apply-templates select="adventures_pulldown" />
<h2><xsl:value-of select="adventures_pulldown/adventure[@selected='yes']" /></h2>

<div class="btn-group buttons">
<a href="/{/output/page}/new_entity/{@adventure_id}" class="btn btn-default">Add entity</a>
<a href="/{/output/page}/new_connection/{@adventure_id}" class="btn btn-default">Add relation</a>
<button class="btn btn-default fullscreen"><span class="glyphicon glyphicon-fullscreen" aria-hidden="true"></span></button>
</div>

<div class="view normal" adventure_id="{@adventure_id}">
<canvas class="connections" />
<div class="entities"></div>
</div>

<entities>
<xsl:for-each select="entities/entity">
<entity id="{@id}" pos_x="{pos_x}" pos_y="{pos_y}">
<title><xsl:value-of select="title" /></title>
<color><xsl:value-of select="color" /></color>
<description><xsl:value-of select="description" /></description>
</entity>
</xsl:for-each>
</entities>
<connections>
<xsl:for-each select="connections/connection">
<connection id="{@id}" from="{from_entity_id}" to="{to_entity_id}">
<title><xsl:value-of select="title" /></title>
<color><xsl:value-of select="color" /></color>
<type><xsl:value-of select="type" /></type>
<description><xsl:value-of select="description" /></description>
</connection>
</xsl:for-each>
</connections>
</xsl:template>

<!--
//
//  Edit entity template
//
//-->
<xsl:template match="edit_entity">
<xsl:call-template name="show_messages" />
<form action="/{/output/page}" method="post">
<xsl:if test="entity/adventure_id">
<input type="hidden" name="adventure_id" value="{entity/adventure_id}" />
</xsl:if>
<xsl:if test="entity/@id">
<input type="hidden" name="id" value="{entity/@id}" />
</xsl:if>
<div class="form-group">
<label for="title">Title</label>
<input type="text" id="title" name="title" value="{entity/title}" maxlength="25" class="form-control" />
</div>
<div class="form-group">
<label for="color">Color</label>
<select id="color" name="color" class="form-control">
<xsl:for-each select="colors/color">
<option value="{@rgb}"><xsl:if test="@rgb=../../entity/color"><xsl:attribute name="selected">selected</xsl:attribute></xsl:if><xsl:value-of select="." /></option>
</xsl:for-each>
</select>
</div>
<div class="form-group">
<label for="description">Description</label>
<textarea id="description" name="description" class="form-control"><xsl:value-of select="entity/description" /></textarea>
</div>

<div class="btn-group">
<input type="submit" name="submit_button" value="Save entity" class="btn btn-default" />
<xsl:if test="entity/@id">
<input type="submit" name="submit_button" value="Delete entity" class="btn btn-default" onClick="javascript:return confirm('DELETE: Are you sure?')" />
</xsl:if>
<a href="/{/output/page}" class="btn btn-default">Back</a>
</div>
</form>
</xsl:template>

<!--
//
//  Edit connection template
//
//-->
<xsl:template match="edit_connection">
<xsl:call-template name="show_messages" />
<form action="/{/output/page}" method="post">
<xsl:if test="connection/adventure_id">
<input type="hidden" name="adventure_id" value="{connection/adventure_id}" />
</xsl:if>
<xsl:if test="connection/@id">
<input type="hidden" name="id" value="{connection/@id}" />
</xsl:if>
<div class="form-group">
<label for="from_entity_id">From entity</label>
<select id="from_entity_id" name="from_entity_id" class="form-control">
<xsl:for-each select="entities/entity">
<option value="{@id}"><xsl:if test="@id=../../connection/from_entity_id"><xsl:attribute name="selected">selected</xsl:attribute></xsl:if><xsl:value-of select="title" /></option>
</xsl:for-each>
</select>
</div>
<div class="form-group">
<label for="to_entity_id">From entity</label>
<select id="to_entity_id" name="to_entity_id" class="form-control">
<xsl:for-each select="entities/entity">
<option value="{@id}"><xsl:if test="@id=../../connection/to_entity_id"><xsl:attribute name="selected">selected</xsl:attribute></xsl:if><xsl:value-of select="title" /></option>
</xsl:for-each>
</select>
</div>
<div class="form-group">
<label for="color">Color</label>
<select id="color" name="color" class="form-control">
<xsl:for-each select="colors/color">
<option value="{@rgb}"><xsl:if test="@rgb=../../connection/color"><xsl:attribute name="selected">selected</xsl:attribute></xsl:if><xsl:value-of select="." /></option>
</xsl:for-each>
</select>
</div>
<div class="form-group">
<label for="type">Type</label>
<select id="type" name="type" class="form-control">
<xsl:for-each select="types/type">
<option value="{position()-1}"><xsl:if test="(position()-1)=../../connection/type"><xsl:attribute name="selected">selected</xsl:attribute></xsl:if><xsl:value-of select="." /></option>
</xsl:for-each>
</select>
</div>
<div class="form-group">
<label for="description">Description</label>
<textarea id="description" name="description" class="form-control"><xsl:value-of select="connection/description" /></textarea>
</div>

<div class="btn-group">
<input type="submit" name="submit_button" value="Save relation" class="btn btn-default" />
<xsl:if test="connection/@id">
<input type="submit" name="submit_button" value="Delete relation" class="btn btn-default" onClick="javascript:return confirm('DELETE: Are you sure?')" />
</xsl:if>
<a href="/{/output/page}" class="btn btn-default">Back</a>
</div>
</form>
</xsl:template>

<!--
//
//  Content template
//
//-->
<xsl:template match="content">
<h1>Relations</h1>
<xsl:apply-templates select="relations" />
<xsl:apply-templates select="edit_entity" />
<xsl:apply-templates select="edit_connection" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
